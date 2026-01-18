import { describe, it, expect } from "vitest";
import { buildTestServer } from "./helpers.js";

const baseSettings = {
     delayMs: 0,
     errorRate: 0,
     errorStatus: 500,
     errorResponse: { error: "Mock error" }
};

describe("behavior settings", () => {
     it("uses error response when errorRate is 1", async () => {
          const app = buildTestServer({
               version: 1,
               settings: { ...baseSettings, errorRate: 1 },
               endpoints: [
                    {
                         method: "GET",
                         path: "/always-fail",
                         response: { ok: true },
                         errorStatus: 503,
                         errorResponse: { message: "Service down" }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/always-fail" });
          expect(res.statusCode).toBe(503);
          expect(res.json()).toEqual({ message: "Service down" });

          await app.close();
     });

     it("renders templates in error responses", async () => {
          const app = buildTestServer({
               version: 1,
               settings: { ...baseSettings, errorRate: 1 },
               endpoints: [
                    {
                         method: "GET",
                         path: "/users/:id",
                         response: { ok: true },
                         errorStatus: 400,
                         errorResponse: { message: "User {{params.id}} missing" }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/users/55" });
          expect(res.statusCode).toBe(400);
          expect(res.json()).toEqual({ message: "User 55 missing" });

          await app.close();
     });

     it("uses variant-level status codes", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "POST",
                         path: "/login",
                         response: { ok: true },
                         variants: [
                              {
                                   name: "unauthorized",
                                   match: { body: { password: "wrong" } },
                                   status: 401,
                                   response: { ok: false }
                              }
                         ]
                    }
               ]
          });

          const res = await app.inject({
               method: "POST",
               url: "/login",
               payload: { password: "wrong" }
          });

          expect(res.statusCode).toBe(401);
          expect(res.json()).toEqual({ ok: false });

          await app.close();
     });
});
