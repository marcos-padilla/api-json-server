import { describe, it, expect } from "vitest";
import { buildTestServerFromFixture, loadFixture } from "./helpers.js";

describe("mockserve - core behavior", () => {
     it("renders templates using path params + query", async () => {
          const app = await buildTestServerFromFixture("tests/fixtures/spec.basic.json");

          const res = await app.inject({
               method: "GET",
               url: "/users/42?type=basic"
          });

          expect(res.statusCode).toBe(200);
          expect(res.json()).toEqual({ id: "42", type: "basic" });

          await app.close();
     });

     it("enforces endpoint-level match rules (query match -> 404 when mismatch)", async () => {
          const app = await buildTestServerFromFixture("tests/fixtures/spec.basic.json");

          const ok = await app.inject({ method: "GET", url: "/search?type=premium" });
          expect(ok.statusCode).toBe(200);

          const bad = await app.inject({ method: "GET", url: "/search?type=basic" });
          expect(bad.statusCode).toBe(404);

          await app.close();
     });

     it("returns variant response when variant match is satisfied", async () => {
          const app = await buildTestServerFromFixture("tests/fixtures/spec.basic.json");

          const res = await app.inject({
               method: "POST",
               url: "/login",
               payload: { email: "a@b.com", password: "wrong" }
          });

          expect(res.statusCode).toBe(401);
          expect(res.json()).toEqual({ ok: false, error: "Invalid credentials" });

          await app.close();
     });

     it("falls back to base endpoint response when no variant matches", async () => {
          const app = await buildTestServerFromFixture("tests/fixtures/spec.basic.json");

          const res = await app.inject({
               method: "POST",
               url: "/login",
               payload: { email: "a@b.com", password: "ok" }
          });

          expect(res.statusCode).toBe(200);
          expect(res.json()).toEqual({ ok: true, message: "default" });

          await app.close();
     });

     it("exposes /__spec for debugging", async () => {
          const app = await buildTestServerFromFixture("tests/fixtures/spec.basic.json");

          const res = await app.inject({ method: "GET", url: "/__spec" });

          expect(res.statusCode).toBe(200);
          const body = res.json();
          expect(body.spec.version).toBe(1);
          expect(body.meta.specPath).toBe("tests/fixtures/spec.basic.json");

          await app.close();
     });
});
