import Fastify, { FastifyInstance } from "fastify";
import { MockSpecInferSchema } from "./spec.js";
import { registerEndpoints } from "./registerEndpoints.js";

export function buildServer(spec: MockSpecInferSchema): FastifyInstance {
     const app = Fastify({
          logger: true
     });

     // Basic sanity route
     app.get("/health", async () => {
          return { ok: true };
     });

     registerEndpoints(app, spec);

     return app;
}
