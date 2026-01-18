import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest, type FastifyBaseLogger } from "fastify";
import type { MockSpecInferSchema } from "./spec.js";
import { registerEndpoints } from "./registerEndpoints.js";
import swaggerUiDist from "swagger-ui-dist";
import { generateOpenApi } from "./openapi.js";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import YAML from "yaml";
import { createLogger } from "./logger/customLogger.js";
import type { LoggerOptions } from "./logger/types.js";
import { HistoryRecorder } from "./history/historyRecorder.js";
import type { HistoryFilter } from "./history/types.js";

type SwaggerUiDistModule = {
     getAbsoluteFSPath?: () => string;
};

/**
 * Resolve the path to swagger-ui-dist assets.
 */
function getSwaggerUiRoot(): string {
     // swagger-ui-dist can be CJS or ESM depending on environment.
     // CJS: require("swagger-ui-dist").getAbsoluteFSPath()
     // ESM: default export may itself be the function.
     const mod: unknown = swaggerUiDist;

     if (typeof mod === "function") return mod();
     if (mod && typeof (mod as SwaggerUiDistModule).getAbsoluteFSPath === "function") {
          return (mod as SwaggerUiDistModule).getAbsoluteFSPath!();
     }

     throw new Error("swagger-ui-dist: cannot determine absolute FS path to dist assets");
}

/**
 * Resolve the server URL for OpenAPI output.
 */
function resolveServerUrl(req: FastifyRequest, baseUrl?: string): string {
     if (baseUrl && baseUrl.trim().length > 0) return baseUrl.trim();

     const host = req.headers.host ?? "localhost";
     const protocol = req.protocol ?? "http";
     return `${protocol}://${host}`;
}

/**
 * Create a Fastify server with mock endpoints and docs.
 */
export function buildServer(
     spec: MockSpecInferSchema,
     meta?: { specPath?: string; loadedAt?: string; baseUrl?: string; logger?: FastifyBaseLogger | boolean }
): FastifyInstance {
     const app = Fastify({
          logger: meta?.logger ?? true,
          trustProxy: true,
          disableRequestLogging: false
     });

     // Register CORS if configured
     if (spec.settings.cors) {
          app.register(fastifyCors, {
               origin: spec.settings.cors.origin ?? true,
               credentials: spec.settings.cors.credentials ?? false,
               methods: spec.settings.cors.methods,
               allowedHeaders: spec.settings.cors.allowedHeaders,
               exposedHeaders: spec.settings.cors.exposedHeaders,
               maxAge: spec.settings.cors.maxAge
          });
     }

     // Register cookie parser plugin
     app.register(fastifyCookie);

     // Create history recorder
     const history = new HistoryRecorder(1000);

     // Record all requests in onRequest hook (after body parsing)
     app.addHook("preHandler", async (req, reply) => {
          const startTime = Date.now();

          // Store start time for response hook
          (req as FastifyRequest & { startTime?: number }).startTime = startTime;

          history.record({
               method: req.method,
               url: req.url,
               path: req.routeOptions?.url ?? req.url.split("?")[0],
               query: req.query as Record<string, unknown>,
               headers: req.headers,
               body: req.body
          });
     });

     // Update history with response details in onResponse hook
     app.addHook("onResponse", async (req, reply) => {
          const startTime = (req as FastifyRequest & { startTime?: number }).startTime ?? Date.now();
          const responseTime = Date.now() - startTime;

          // Find and update the last entry (just added in onRequest)
          const entries = history.query({ limit: 1 });
          if (entries.length > 0) {
               const lastEntry = entries[entries.length - 1];
               lastEntry.statusCode = reply.statusCode;
               lastEntry.responseTime = responseTime;
          }
     });

     /**
      * Handler for the /__spec route with bound metadata.
      */
     function specRouteHandler() {
          return specHandler(spec, meta);
     }

     /**
      * Handler for the /__openapi.json route.
      */
     function openApiJsonRouteHandler(req: FastifyRequest) {
          return openApiJsonHandler(req, spec, meta?.baseUrl);
     }

     /**
      * Handler for the /__openapi.yaml route.
      */
     function openApiYamlRouteHandler(req: FastifyRequest, reply: FastifyReply): void {
          return openApiYamlHandler(req, reply, spec, meta?.baseUrl);
     }

     /**
      * Handler for the /docs route.
      */
     function docsRouteHandler(req: FastifyRequest, reply: FastifyReply): void {
          return docsHandler(req, reply);
     }

     // Basic sanity route
     app.get("/health", healthHandler);

     // Internal inspection endpoint
     app.get("/__spec", specRouteHandler);

     app.get("/__openapi.json", openApiJsonRouteHandler);

     app.get("/__openapi.yaml", openApiYamlRouteHandler);

     app.register(fastifyStatic, {
          root: getSwaggerUiRoot(),
          prefix: "/docs/assets/",
          decorateReply: false
     });

     app.get("/docs", docsRouteHandler);

     // History endpoints
     app.get("/__history", async (req) => {
          const query = req.query as Record<string, string>;
          const filter: HistoryFilter = {
               endpoint: query.endpoint,
               method: query.method,
               statusCode: query.statusCode ? Number(query.statusCode) : undefined,
               limit: query.limit ? Number(query.limit) : undefined
          };
          return { entries: history.query(filter), total: history.count() };
     });

     app.delete("/__history", async () => {
          history.clear();
          return { ok: true, message: "History cleared" };
     });

     registerEndpoints(app, spec);

     return app;
}

/**
 * Health check handler.
 */
function healthHandler(): { ok: true } {
     return { ok: true };
}

/**
 * Debug handler that exposes the current spec and metadata.
 */
function specHandler(spec: MockSpecInferSchema, meta?: { specPath?: string; loadedAt?: string }) {
     return {
          meta: {
               specPath: meta?.specPath ?? null,
               loadedAt: meta?.loadedAt ?? null
          },
          spec
     };
}

/**
 * Serve the OpenAPI document as JSON.
 */
function openApiJsonHandler(req: FastifyRequest, spec: MockSpecInferSchema, baseUrl?: string) {
     const serverUrl = resolveServerUrl(req, baseUrl);
     return generateOpenApi(spec, serverUrl);
}

/**
 * Serve the OpenAPI document as YAML.
 */
function openApiYamlHandler(
     req: FastifyRequest,
     reply: FastifyReply,
     spec: MockSpecInferSchema,
     baseUrl?: string
): void {
     const serverUrl = resolveServerUrl(req, baseUrl);
     const doc = generateOpenApi(spec, serverUrl);
     const yaml = YAML.stringify(doc);
     reply.type("application/yaml; charset=utf-8").send(yaml);
}

/**
 * Serve the Swagger UI HTML page.
 */
function docsHandler(_req: FastifyRequest, reply: FastifyReply): void {
     const html = `<!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       <title>mockserve docs</title>
       <link rel="stylesheet" href="/docs/assets/swagger-ui.css" />
       <style>
         html, body { margin: 0; padding: 0; }
       </style>
     </head>
     <body>
       <div id="swagger-ui"></div>
     
       <script src="/docs/assets/swagger-ui-bundle.js"></script>
       <script src="/docs/assets/swagger-ui-standalone-preset.js"></script>
       <script>
         window.ui = SwaggerUIBundle({
           url: "/__openapi.json",
           dom_id: "#swagger-ui",
           presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
           layout: "BaseLayout"
         });
       </script>
     </body>
     </html>`;
     reply.type("text/html; charset=utf-8").send(html);
}
