import type { MockSpecInferSchema } from "./spec.js";

type OpenApiParameter = {
     name: string;
     in: "path" | "query";
     required: boolean;
     schema: Record<string, unknown>;
     description?: string;
};

type OpenApiRequestBody = {
     required: boolean;
     content: Record<string, { schema: Record<string, unknown> }>;
};

type OpenApiResponse = {
     description: string;
     content: Record<string, { examples: Record<string, { value: unknown }> }>;
};

type OpenApiOperation = {
     summary: string;
     parameters?: OpenApiParameter[];
     requestBody?: OpenApiRequestBody;
     responses: Record<string, OpenApiResponse>;
};

type OpenApi = {
     openapi: string;
     info: { title: string; version: string; description: string };
     servers: Array<{ url: string }>;
     paths: Record<string, Record<string, OpenApiOperation>>;
};

/**
 * Convert Fastify-style route params to OpenAPI style.
 */
function toOpenApiPath(fastifyPath: string): string {
     // Fastify style: /users/:id -> OpenAPI style: /users/{id}
     return fastifyPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

/**
 * Extract path parameter names from a Fastify-style route.
 */
function extractPathParams(fastifyPath: string): string[] {
     const matches = [...fastifyPath.matchAll(/:([A-Za-z0-9_]+)/g)];
     return matches.map((m) => m[1]);
}

/**
 * Deduplicate values while preserving order.
 */
function uniq<T>(items: T[]): T[] {
     return [...new Set(items)];
}

/**
 * Convert a list of values into a list of string enums.
 */
function asStringEnum(values: unknown[]): string[] {
     return uniq(
          values
               .filter((v) => v !== undefined && v !== null)
               .map((v) => String(v))
     );
}

/**
 * Generate a minimal OpenAPI document for the mock spec.
 */
export function generateOpenApi(spec: MockSpecInferSchema, serverUrl: string): OpenApi {
     const paths: Record<string, Record<string, OpenApiOperation>> = {};

     for (const ep of spec.endpoints) {
          const oasPath = toOpenApiPath(ep.path);
          const method = ep.method.toLowerCase();

          const pathParams = extractPathParams(ep.path);

          // Collect query match keys/values across endpoint + variants
          const queryMatchValues: Record<string, string[]> = {};
          const bodyMatchKeys: Set<string> = new Set();

          /**
           * Collect query match values into a set for documentation.
           */
          const collectQuery = (obj?: Record<string, string | number | boolean>) => {
               if (!obj) return;
               for (const [k, v] of Object.entries(obj)) {
                    if (!queryMatchValues[k]) queryMatchValues[k] = [];
                    queryMatchValues[k].push(String(v));
               }
          };

          /**
           * Collect body match keys for request body documentation.
           */
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
          const parameters: OpenApiParameter[] = [];

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
          const requestBody: OpenApiRequestBody | undefined =
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
          const responses: Record<string, OpenApiResponse> = {};

          /**
           * Add a response example to the OpenAPI response map.
           */
          const addResponseExample = (status: number, name: string, example: unknown) => {
               const key = String(status);
               if (!responses[key]) {
                    responses[key] = {
                         description: "Mock response",
                         content: { "application/json": { examples: {} as Record<string, { value: unknown }> } }
                    };
               }
               const examples = responses[key].content["application/json"].examples as Record<string, { value: unknown }>;
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

          const operation: OpenApiOperation = {
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
