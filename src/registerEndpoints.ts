import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { MockSpecInferSchema, EndpointSpecInferSchema } from './spec.js'
import { renderTemplate } from './template.js';


function normalizeMethod(method: EndpointSpecInferSchema["method"]): Lowercase<EndpointSpecInferSchema["method"]> {
     return method.toLowerCase() as Lowercase<EndpointSpecInferSchema["method"]>;
}

function sleep(ms: number): Promise<void> {
     return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldFail(errorRate: number): boolean {
     if (errorRate <= 0) return false;
     if (errorRate >= 1) return true;
     return Math.random() < errorRate;
}


function resolveBehavior(spec: MockSpecInferSchema, endpoint: EndpointSpecInferSchema) {
     const settings = spec.settings;

     const delayMs = endpoint.delayMs ?? settings.delayMs;
     const errorRate = endpoint.errorRate ?? settings.errorRate;

     const errorStatus = endpoint.errorStatus ?? settings.errorStatus;
     const errorResponse = endpoint.errorResponse ?? settings.errorResponse;

     return { delayMs, errorRate, errorStatus, errorResponse };
}


function asRecord(value: unknown): Record<string, unknown> {
     if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
     return {};
}

function queryMatches(req: FastifyRequest, endpoint: EndpointSpecInferSchema): boolean {
     const required = endpoint.match?.query;
     if (!required) return true;

     const q = asRecord(req.query);

     for (const [key, expected] of Object.entries(required)) {
          const actual = q[key];

          if (Array.isArray(actual)) return false;

          if (String(actual ?? "") !== String(expected)) return false;
     }

     return true;
}

function bodyMatches(req: FastifyRequest, expected?: Record<string, string | number | boolean>): boolean {
     if (!expected) return true;

     const b = req.body;
     if (!b || typeof b !== "object" || Array.isArray(b)) return false;

     const body = b as Record<string, unknown>;

     for (const [key, exp] of Object.entries(expected)) {
          const actual = body[key];
          if (String(actual ?? "") !== String(exp)) return false;
     }
     return true;
}

function matchRequest(req: FastifyRequest, match?: { query?: Record<string, any>; body?: Record<string, any> }): boolean {
     if (!match) return true;

     // query exact match
     const requiredQuery = match.query;
     if (requiredQuery) {
          const q = asRecord(req.query);
          for (const [key, expected] of Object.entries(requiredQuery)) {
               const actual = q[key];
               if (Array.isArray(actual)) return false;
               if (String(actual ?? "") !== String(expected)) return false;
          }
     }

     // body exact match (top-level)
     if (!bodyMatches(req, match.body)) return false;

     return true;
}


export function registerEndpoints(app: FastifyInstance, spec: MockSpecInferSchema): void {
     for (const endpoint of spec.endpoints) {
          app.route({
               method: endpoint.method,
               url: endpoint.path,
               handler: async (req, reply) => {
                    // Decide which "response source" to use: variant or base endpoint
                    let chosen:
                         | {
                              status?: number;
                              response: unknown;
                              delayMs?: number;
                              errorRate?: number;
                              errorStatus?: number;
                              errorResponse?: unknown;
                         }
                         | null = null;

                    // 1) Try variants first (first match wins)
                    if (endpoint.variants && endpoint.variants.length > 0) {
                         for (const v of endpoint.variants) {
                              if (matchRequest(req, v.match)) {
                                   chosen = {
                                        status: v.status,
                                        response: v.response,
                                        delayMs: v.delayMs,
                                        errorRate: v.errorRate,
                                        errorStatus: v.errorStatus,
                                        errorResponse: v.errorResponse
                                   };
                                   break;
                              }
                         }
                    }

                    // 2) If no variant matched, fall back to endpoint-level match/response
                    if (!chosen) {
                         // Backward compatible: if your endpoint only has query match, this still works
                         // If you've upgraded schema to endpoint.match (query/body), this uses it
                         // If you haven't, you can replace endpoint.match with: { query: endpoint.match?.query }
                         const endpointMatch = (endpoint as any).match ?? { query: (endpoint as any).match?.query };

                         if (!matchRequest(req, endpointMatch)) {
                              reply.code(404);
                              return { error: "No matching mock for request" };
                         }

                         chosen = {
                              status: endpoint.status,
                              response: endpoint.response,
                              delayMs: (endpoint as any).delayMs,
                              errorRate: (endpoint as any).errorRate,
                              errorStatus: (endpoint as any).errorStatus,
                              errorResponse: (endpoint as any).errorResponse
                         };
                    }

                    // 3) Resolve behavior: chosen overrides -> endpoint -> global settings
                    const settings = spec.settings;

                    const delayMs = chosen.delayMs ?? (endpoint as any).delayMs ?? settings.delayMs;
                    const errorRate = chosen.errorRate ?? (endpoint as any).errorRate ?? settings.errorRate;
                    const errorStatus = chosen.errorStatus ?? (endpoint as any).errorStatus ?? settings.errorStatus;
                    const errorResponse = chosen.errorResponse ?? (endpoint as any).errorResponse ?? settings.errorResponse;

                    if (delayMs > 0) {
                         await sleep(delayMs);
                    }

                    if (shouldFail(errorRate)) {
                         reply.code(errorStatus);
                         return errorResponse;
                    }

                    // 4) Template rendering using request context
                    const params = asRecord(req.params);
                    const query = asRecord(req.query);
                    const body = req.body;

                    const rendered = renderTemplate(chosen.response, { params, query, body });

                    // 5) Status code precedence: chosen -> endpoint -> 200
                    reply.code(chosen.status ?? endpoint.status ?? 200);
                    return rendered;
               }
          });

          app.log.info(
               `Registered ${endpoint.method} ${endpoint.path} -> ${endpoint.status} (delay=${endpoint.delayMs ?? spec.settings.delayMs}ms, errorRate=${endpoint.errorRate ?? spec.settings.errorRate})`
          );
     }
}