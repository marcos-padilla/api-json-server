import { describe, it, expect } from "vitest";
import { buildTestServer } from "./helpers.js";

const baseSettings = {
     delayMs: 0,
     errorRate: 0,
     errorStatus: 500,
     errorResponse: { error: "Mock error" }
};

describe("custom response headers", () => {
     it("sets custom headers on endpoint responses", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/data",
                         response: { data: "value" },
                         headers: {
                              "X-Custom-Header": "test-value",
                              "Cache-Control": "no-cache"
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/api/data" });
          expect(res.statusCode).toBe(200);
          expect(res.headers["x-custom-header"]).toBe("test-value");
          expect(res.headers["cache-control"]).toBe("no-cache");

          await app.close();
     });

     it("supports template strings in header values", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/users/:id",
                         response: { id: "{{params.id}}" },
                         headers: {
                              "X-User-ID": "{{params.id}}",
                              "X-Query-Type": "{{query.type}}"
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/users/42?type=premium" });
          expect(res.statusCode).toBe(200);
          expect(res.headers["x-user-id"]).toBe("42");
          expect(res.headers["x-query-type"]).toBe("premium");

          await app.close();
     });

     it("variant headers override endpoint headers", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/data",
                         response: { source: "base" },
                         headers: {
                              "X-Source": "endpoint"
                         },
                         variants: [
                              {
                                   name: "special",
                                   match: { query: { mode: "special" } },
                                   response: { source: "variant" },
                                   headers: {
                                        "X-Source": "variant"
                                   }
                              }
                         ]
                    }
               ]
          });

          const baseRes = await app.inject({ method: "GET", url: "/api/data" });
          expect(baseRes.headers["x-source"]).toBe("endpoint");

          const variantRes = await app.inject({ method: "GET", url: "/api/data?mode=special" });
          expect(variantRes.headers["x-source"]).toBe("variant");

          await app.close();
     });

     it("handles multiple custom headers", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/cors-test",
                         response: { ok: true },
                         headers: {
                              "Access-Control-Allow-Origin": "*",
                              "Access-Control-Allow-Methods": "GET, POST",
                              "X-RateLimit-Limit": "100",
                              "X-RateLimit-Remaining": "95"
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/api/cors-test" });
          expect(res.headers["access-control-allow-origin"]).toBe("*");
          expect(res.headers["access-control-allow-methods"]).toBe("GET, POST");
          expect(res.headers["x-ratelimit-limit"]).toBe("100");
          expect(res.headers["x-ratelimit-remaining"]).toBe("95");

          await app.close();
     });
});
