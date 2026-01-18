import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { MockSpecInferSchema } from "./spec.js";
import { registerEndpoints } from "./registerEndpoints.js";
import swaggerUiDist from "swagger-ui-dist";
import { generateOpenApi } from "./openapi.js";
import fastifyStatic from "@fastify/static";
import YAML from "yaml";

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
     meta?: { specPath?: string; loadedAt?: string; baseUrl?: string }
): FastifyInstance {
     const app = Fastify({
          logger: true,
          trustProxy: true
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
