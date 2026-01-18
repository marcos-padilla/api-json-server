import { describe, it, expect } from "vitest";
import { buildTestServer } from "./helpers.js";

const baseSettings = {
     delayMs: 0,
     errorRate: 0,
     errorStatus: 500,
     errorResponse: { error: "Mock error" }
};

describe("CORS configuration", () => {
     it("enables CORS with wildcard origin when configured", async () => {
          const app = buildTestServer({
               version: 1,
               settings: {
                    ...baseSettings,
                    cors: {
                         origin: "*",
                         credentials: false
                    }
               },
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/data",
                         response: { data: "value" }
                    }
               ]
          });

          const res = await app.inject({
               method: "GET",
               url: "/api/data",
               headers: { origin: "https://example.com" }
          });

          expect(res.statusCode).toBe(200);
          expect(res.headers["access-control-allow-origin"]).toBe("*");

          await app.close();
     });

     it("handles preflight OPTIONS requests", async () => {
          const app = buildTestServer({
               version: 1,
               settings: {
                    ...baseSettings,
                    cors: {
                         origin: "https://example.com",
                         methods: ["GET", "POST"],
                         credentials: true
                    }
               },
               endpoints: [
                    {
                         method: "POST",
                         path: "/api/data",
                         response: { ok: true }
                    }
               ]
          });

          const res = await app.inject({
               method: "OPTIONS",
               url: "/api/data",
               headers: {
                    origin: "https://example.com",
                    "access-control-request-method": "POST"
               }
          });

          expect(res.statusCode).toBe(204);
          expect(res.headers["access-control-allow-origin"]).toBeTruthy();

          await app.close();
     });

     it("allows specific origins when configured", async () => {
          const app = buildTestServer({
               version: 1,
               settings: {
                    ...baseSettings,
                    cors: {
                         origin: "https://trusted.com",
                         credentials: true
                    }
               },
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/secure",
                         response: { data: "secure" }
                    }
               ]
          });

          const res = await app.inject({
               method: "GET",
               url: "/api/secure",
               headers: { origin: "https://trusted.com" }
          });

          expect(res.statusCode).toBe(200);
          expect(res.headers["access-control-allow-origin"]).toBe("https://trusted.com");
          expect(res.headers["access-control-allow-credentials"]).toBe("true");

          await app.close();
     });

     it("works without CORS configuration", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/data",
                         response: { data: "value" }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/api/data" });
          expect(res.statusCode).toBe(200);

          await app.close();
     });
});
