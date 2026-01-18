import { describe, it, expect } from "vitest";
import { buildTestServer } from "./helpers.js";

const baseSettings = {
     delayMs: 0,
     errorRate: 0,
     errorStatus: 500,
     errorResponse: { error: "Mock error" }
};

describe("faker templates", () => {
     it("generates deterministic faker data when fakerSeed is set", async () => {
          const app = buildTestServer({
               version: 1,
               settings: { ...baseSettings, fakerSeed: 123 },
               endpoints: [
                    {
                         method: "GET",
                         path: "/profile",
                         response: {
                              firstName: { __faker: "person.firstName" },
                              lastName: { __faker: "person.lastName" },
                              email: { __faker: "internet.email" }
                         }
                    }
               ]
          });

          const res1 = await app.inject({ method: "GET", url: "/profile" });
          const res2 = await app.inject({ method: "GET", url: "/profile" });

          expect(res1.statusCode).toBe(200);
          expect(res2.statusCode).toBe(200);
          expect(res1.json()).toEqual(res2.json());

          await app.close();
     });

     it("supports faker methods with arguments", async () => {
          const app = buildTestServer({
               version: 1,
               settings: { ...baseSettings, fakerSeed: 7 },
               endpoints: [
                    {
                         method: "GET",
                         path: "/token",
                         response: {
                              token: { __faker: { method: "string.alpha", args: [16] } }
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/token" });
          const body = res.json();

          expect(res.statusCode).toBe(200);
          expect(typeof body.token).toBe("string");
          expect(body.token).toHaveLength(16);

          await app.close();
     });

     it("renders repeat directives with a min/max range", async () => {
          const app = buildTestServer({
               version: 1,
               settings: { ...baseSettings, fakerSeed: 55 },
               endpoints: [
                    {
                         method: "GET",
                         path: "/users",
                         response: {
                              users: {
                                   __repeat: {
                                        min: 10,
                                        max: 15,
                                        template: {
                                             id: { __faker: "string.uuid" },
                                             firstName: { __faker: "person.firstName" },
                                             email: { __faker: "internet.email" }
                                        }
                                   }
                              }
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/users" });
          const body = res.json();

          expect(res.statusCode).toBe(200);
          expect(Array.isArray(body.users)).toBe(true);
          expect(body.users.length).toBeGreaterThanOrEqual(10);
          expect(body.users.length).toBeLessThanOrEqual(15);
          expect(typeof body.users[0].firstName).toBe("string");

          await app.close();
     });

     it("renders repeat directives with a fixed count", async () => {
          const app = buildTestServer({
               version: 1,
               settings: { ...baseSettings, fakerSeed: 1 },
               endpoints: [
                    {
                         method: "GET",
                         path: "/companies",
                         response: {
                              companies: {
                                   __repeat: {
                                        count: 3,
                                        min: 0,
                                        template: {
                                             name: { __faker: "company.name" },
                                             phone: { __faker: "phone.number" }
                                        }
                                   }
                              }
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/companies" });
          const body = res.json();

          expect(res.statusCode).toBe(200);
          expect(body.companies).toHaveLength(3);

          await app.close();
     });

     it("returns 500 when faker method is invalid", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/bad",
                         response: { value: { __faker: "nope.method" } }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/bad" });
          expect(res.statusCode).toBe(500);

          await app.close();
     });

     it("returns 500 when repeat max is below min", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/bad-repeat",
                         response: {
                              items: {
                                   __repeat: { min: 5, max: 2, template: { id: 1 } }
                              }
                         }
                    }
               ]
          });

          const res = await app.inject({ method: "GET", url: "/bad-repeat" });
          expect(res.statusCode).toBe(500);

          await app.close();
     });
});
