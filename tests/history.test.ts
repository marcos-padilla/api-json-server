import { describe, it, expect } from "vitest";
import { buildTestServer } from "./helpers.js";

const baseSettings = {
     delayMs: 0,
     errorRate: 0,
     errorStatus: 500,
     errorResponse: { error: "Mock error" }
};

describe("request history", () => {
     it("records all requests in history", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/test",
                         response: { ok: true }
                    }
               ]
          });

          await app.inject({ method: "GET", url: "/api/test?foo=bar" });
          await app.inject({ method: "GET", url: "/api/test?foo=baz" });

          const historyRes = await app.inject({ method: "GET", url: "/__history" });
          expect(historyRes.statusCode).toBe(200);

          const history = historyRes.json();
          expect(history.entries).toBeInstanceOf(Array);
          expect(history.entries.length).toBeGreaterThanOrEqual(2);
          expect(history.total).toBeGreaterThanOrEqual(2);

          await app.close();
     });

     it("records request details including method, url, headers, and body", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "POST",
                         path: "/api/create",
                         response: { id: 1 }
                    }
               ]
          });

          await app.inject({
               method: "POST",
               url: "/api/create",
               headers: { "content-type": "application/json" },
               payload: { name: "test" }
          });

          const historyRes = await app.inject({ method: "GET", url: "/__history?endpoint=/api/create" });
          const history = historyRes.json();
          
          // Should have at least one POST to /api/create
          const postEntries = history.entries.filter((e: {method: string; path: string}) => 
               e.method === "POST" && e.path === "/api/create"
          );
          expect(postEntries.length).toBeGreaterThan(0);
          
          const lastEntry = postEntries[postEntries.length - 1];
          expect(lastEntry.method).toBe("POST");
          expect(lastEntry.url).toContain("/api/create");
          expect(lastEntry.headers["content-type"]).toBe("application/json");
          expect(lastEntry.body).toEqual({ name: "test" });

          await app.close();
     });

     it("filters history by endpoint", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/users",
                         response: { users: [] }
                    },
                    {
                         method: "GET",
                         path: "/api/posts",
                         response: { posts: [] }
                    }
               ]
          });

          await app.inject({ method: "GET", url: "/api/users" });
          await app.inject({ method: "GET", url: "/api/posts" });
          await app.inject({ method: "GET", url: "/api/users" });

          const historyRes = await app.inject({ method: "GET", url: "/__history?endpoint=/api/users" });
          const history = historyRes.json();

          expect(history.entries.every((e: { path: string }) => e.path === "/api/users")).toBe(true);

          await app.close();
     });

     it("filters history by method", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/data",
                         response: { data: "get" }
                    },
                    {
                         method: "POST",
                         path: "/api/data",
                         response: { data: "post" }
                    }
               ]
          });

          await app.inject({ method: "GET", url: "/api/data" });
          await app.inject({ method: "POST", url: "/api/data" });
          await app.inject({ method: "GET", url: "/api/data" });

          const historyRes = await app.inject({ method: "GET", url: "/__history?method=POST" });
          const history = historyRes.json();

          expect(history.entries.every((e: { method: string }) => e.method === "POST")).toBe(true);

          await app.close();
     });

     it("clears history on DELETE request", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/test",
                         response: { ok: true }
                    }
               ]
          });

          await app.inject({ method: "GET", url: "/api/test" });

          const beforeClear = await app.inject({ method: "GET", url: "/__history" });
          expect(beforeClear.json().entries.length).toBeGreaterThan(0);

          await app.inject({ method: "DELETE", url: "/__history" });

          const afterClear = await app.inject({ method: "GET", url: "/__history" });
          // Should only have the history requests themselves
          expect(afterClear.json().entries.length).toBeLessThanOrEqual(2);

          await app.close();
     });

     it("limits history entries with limit parameter", async () => {
          const app = buildTestServer({
               version: 1,
               settings: baseSettings,
               endpoints: [
                    {
                         method: "GET",
                         path: "/api/test",
                         response: { ok: true }
                    }
               ]
          });

          for (let i = 0; i < 10; i++) {
               await app.inject({ method: "GET", url: "/api/test" });
          }

          const historyRes = await app.inject({ method: "GET", url: "/__history?limit=3" });
          const history = historyRes.json();

          expect(history.entries.length).toBeLessThanOrEqual(3);

          await app.close();
     });
});
