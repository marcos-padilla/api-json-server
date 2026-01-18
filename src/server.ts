import Fastify, { FastifyInstance } from "fastify";
import { MockSpecInferSchema } from "./spec.js";
import { registerEndpoints } from "./registerEndpoints.js";

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

     registerEndpoints(app, spec);

     return app;
}
