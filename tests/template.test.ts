import { describe, it, expect } from "vitest";
import { buildTestServer } from "./helpers.js";

const baseSettings = {
     delayMs: 0,
     errorRate: 0,
     errorStatus: 500,
     errorResponse: { error: "Mock error" }
};

describe("template rendering", () => {
     it("renders params and query placeholders in responses", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/users/:id",
                         response: {
                              id: "{{params.id}}",
                              type: "{{query.type}}",
                              nested: { tag: "{{query.tag}}" }
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/users/42?type=basic&tag=vip" });
          expect(res.statusCode).toBe(200);
          expect(res.json()).toEqual({ id: "42", type: "basic", nested: { tag: "vip" } });

          await app.close();
     });

     it("renders body placeholders in responses", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "POST",
                         path: "/echo",
                         response: {
                              email: "{{body.email}}",
                              name: "{{body.profile.name}}"
                         }
                    }
               ]
          });

          const res = await app.inject({
               method: "POST",
               url: "/echo",
               payload: { email: "user@example.com", profile: { name: "Mia" } }
          });

          expect(res.statusCode).toBe(200);
          expect(res.json()).toEqual({ email: "user@example.com", name: "Mia" });

          await app.close();
     });

     it("renders arrays of templated items", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/tags/:id",
                         response: {
                              id: "{{params.id}}",
                              tags: ["{{query.primary}}", "{{query.secondary}}"]
                         }
                    }
               ]
          });

          const res = await app.inject({
               method: "GET",
               url: "/tags/abc?primary=gold&secondary=silver"
          });

          expect(res.statusCode).toBe(200);
          expect(res.json()).toEqual({ id: "abc", tags: ["gold", "silver"] });

          await app.close();
     });
});
