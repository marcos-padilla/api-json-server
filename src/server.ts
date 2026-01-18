import Fastify, { FastifyInstance } from "fastify";

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  // Basic sanity route
  app.get("/health", async () => {
    return { ok: true };
  });

  return app;
}
