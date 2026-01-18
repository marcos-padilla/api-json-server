import Fastify, { FastifyInstance } from "fastify";
import { MockSpecInferSchema } from "./spec.js";
import { registerEndpoints } from "./registerEndpoints.js";
import swaggerUiDist from "swagger-ui-dist";
import { generateOpenApi } from "./openapi.js";
import fastifyStatic from "@fastify/static";

function getSwaggerUiRoot(): string {
     // swagger-ui-dist can be CJS or ESM depending on environment.
     // CJS: require("swagger-ui-dist").getAbsoluteFSPath()
     // ESM: default export may itself be the function.
     const mod: any = swaggerUiDist as any;

     if (typeof mod === "function") return mod();
     if (mod && typeof mod.getAbsoluteFSPath === "function") return mod.getAbsoluteFSPath();

     throw new Error("swagger-ui-dist: cannot determine absolute FS path to dist assets");
}

export function buildServer(spec: MockSpecInferSchema, meta?: { specPath?: string; loadedAt?: string }): FastifyInstance {
     const app = Fastify({
          logger: true
     });

     // Basic sanity route
     app.get("/health", async () => {
          return { ok: true };
     });

     // Internal inspection endpoint
     app.get("/__spec", async () => {
          return {
               meta: {
                    specPath: meta?.specPath ?? null,
                    loadedAt: meta?.loadedAt ?? null
               },
               spec
          };
     });

     app.get("/__openapi.json", async (req) => {
          const host = req.headers.host ?? "localhost";
          const serverUrl = `${req.protocol}://${host}`;
          return generateOpenApi(spec, serverUrl);
     });

     app.register(fastifyStatic, {
          root: getSwaggerUiRoot(),
          prefix: "/docs/assets/",
          decorateReply: false
     });

     app.get("/docs", async (_req, reply) => {
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
     });

     registerEndpoints(app, spec);

     return app;
}
