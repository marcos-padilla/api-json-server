import { describe, it, expect } from "vitest";
import { buildTestServer } from "./helpers.js";

const baseSettings = {
     delayMs: 0,
     errorRate: 0,
     errorStatus: 500,
     errorResponse: { error: "Mock error" }
};

describe("matching rules", () => {
     it("returns 404 when endpoint-level query match fails", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/search",
                         match: { query: { type: "premium" } },
                         response: { ok: true }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/search?type=basic" });
          expect(res.statusCode).toBe(404);

          await app.close();
     });

     it("matches endpoint-level body rules for POST", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "POST",
                         path: "/login",
                         match: { body: { password: "secret" } },
                         response: { ok: true }
                    }
               ]
          });

          const ok = await app.inject({ method: "POST", url: "/login", payload: { password: "secret" } });
          expect(ok.statusCode).toBe(200);

          const bad = await app.inject({ method: "POST", url: "/login", payload: { password: "wrong" } });
          expect(bad.statusCode).toBe(404);

          await app.close();
     });

     it("uses first matching variant when multiple variants match", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "POST",
                         path: "/variants",
                         response: { ok: true, source: "base" },
                         variants: [
                              {
                                   name: "first",
                                   match: { body: { role: "admin" } },
                                   status: 403,
                                   response: { ok: false, source: "first" }
                              },
                              {
                                   name: "second",
                                   match: { body: { role: "admin" } },
                                   status: 200,
                                   response: { ok: true, source: "second" }
                              }
                         ]
                    }
               ]
          });

          const res = await app.inject({ method: "POST", url: "/variants", payload: { role: "admin" } });
          expect(res.statusCode).toBe(403);
          expect(res.json()).toEqual({ ok: false, source: "first" });

          await app.close();
     });

     it("falls back to endpoint response when no variant matches", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "POST",
                         path: "/variants",
                         response: { ok: true, source: "base" },
                         variants: [
                              {
                                   name: "only",
                                   match: { body: { role: "admin" } },
                                   status: 201,
                                   response: { ok: true, source: "variant" }
                              }
                         ]
                    }
               ]
          });

          const res = await app.inject({ method: "POST", url: "/variants", payload: { role: "user" } });
          expect(res.statusCode).toBe(200);
          expect(res.json()).toEqual({ ok: true, source: "base" });

          await app.close();
     });

     it("rejects array query values for match rules", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/search",
                         match: { query: { type: "premium" } },
                         response: { ok: true }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/search?type=premium&type=basic" });
          expect(res.statusCode).toBe(404);

          await app.close();
     });
});
