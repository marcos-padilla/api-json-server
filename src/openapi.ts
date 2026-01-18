import type { MockSpecInferSchema } from "./spec.js";

type OpenApi = Record<string, unknown>;

function toOpenApiPath(fastifyPath: string): string {
     // Fastify style: /users/:id -> OpenAPI style: /users/{id}
     return fastifyPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function extractPathParams(fastifyPath: string): string[] {
     const matches = [...fastifyPath.matchAll(/:([A-Za-z0-9_]+)/g)];
     return matches.map((m) => m[1]);
}

function uniq<T>(items: T[]): T[] {
     return [...new Set(items)];
}

function asStringEnum(values: unknown[]): string[] {
     return uniq(
          values
               .filter((v) => v !== undefined && v !== null)
               .map((v) => String(v))
     );
}

export function generateOpenApi(spec: MockSpecInferSchema, serverUrl: string): OpenApi {
     const paths: Record<string, any> = {};

     for (const ep of spec.endpoints) {
          const oasPath = toOpenApiPath(ep.path);
          const method = ep.method.toLowerCase();

          const pathParams = extractPathParams(ep.path);

          // Collect query match keys/values across endpoint + variants
          const queryMatchValues: Record<string, string[]> = {};
          const bodyMatchKeys: Set<string> = new Set();

          const collectQuery = (obj?: Record<string, string | number | boolean>) => {
               if (!obj) return;
               for (const [k, v] of Object.entries(obj)) {
                    if (!queryMatchValues[k]) queryMatchValues[k] = [];
                    queryMatchValues[k].push(String(v));
               }
          };

          const collectBody = (obj?: Record<string, string | number | boolean>) => {
               if (!obj) return;
               for (const k of Object.keys(obj)) bodyMatchKeys.add(k);
          };

          collectQuery(ep.match?.query);
          collectBody(ep.match?.body);

          if (ep.variants?.length) {
               for (const v of ep.variants) {
                    collectQuery(v.match?.query);
                    collectBody(v.match?.body);
               }
          }

          // Parameters: path params + known query keys
          const parameters: any[] = [];

          for (const p of pathParams) {
               parameters.push({
                    name: p,
                    in: "path",
                    required: true,
                    schema: { type: "string" }
               });
          }

          for (const [k, vals] of Object.entries(queryMatchValues)) {
               const enumVals = asStringEnum(vals);
               parameters.push({
                    name: k,
                    in: "query",
                    required: false,
                    schema: enumVals.length > 0 ? { type: "string", enum: enumVals } : { type: "string" },
                    description: "Query param used by mock matching (if configured)."
               });
          }

          // Request body: for non-GET/DELETE, document as generic object with known keys (from match rules)
          const hasRequestBody = ep.method !== "GET" && ep.method !== "DELETE";
          const requestBody =
               hasRequestBody && bodyMatchKeys.size > 0
                    ? {
                         required: false,
                         content: {
                              "application/json": {
                                   schema: {
                                        type: "object",
                                        properties: Object.fromEntries([...bodyMatchKeys].map((k) => [k, { type: "string" }]))
                                   }
                              }
                         }
                    }
                    : undefined;

          // Responses: base + variants (grouped per status)
          const responses: Record<string, any> = {};

          const addResponseExample = (status: number, name: string, example: unknown) => {
               const key = String(status);
               if (!responses[key]) {
                    responses[key] = {
                         description: "Mock response",
                         content: { "application/json": { examples: {} as Record<string, any> } }
                    };
               }
               const examples = responses[key].content["application/json"].examples as Record<string, any>;
               examples[name] = { value: example };
          };

          // Base response
          addResponseExample(ep.status ?? 200, "default", ep.response);

          // Variant responses
          if (ep.variants?.length) {
               for (const v of ep.variants) {
                    addResponseExample(v.status ?? ep.status ?? 200, v.name ?? "variant", v.response);
               }
          }

          const operation: any = {
               summary: `Mock ${ep.method} ${ep.path}`,
               parameters: parameters.length ? parameters : undefined,
               requestBody,
               responses
          };

          if (!paths[oasPath]) paths[oasPath] = {};
          paths[oasPath][method] = operation;
     }

     return {
          openapi: "3.0.3",
          info: {
               title: "mockserve",
               version: "0.1.0",
               description: "OpenAPI document generated from mockserve JSON spec."
          },
          servers: [{ url: serverUrl }],
          paths
     };
}
