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


export function registerEndpoints(app: FastifyInstance, spec: MockSpecInferSchema): void {
     for (const endpoint of spec.endpoints) {
          const method = normalizeMethod(endpoint.method)
          const path = endpoint.path

          app.route({
               method: endpoint.method,
               url: endpoint.path,
               handler: async (req, reply) => {
                    // 1) Match requirements (query)
                    if (!queryMatches(req, endpoint)) {
                         reply.code(404);
                         return { error: "No matching mock for request (query mismatch)" };
                    }

                    // 2) Delay + error simulation
                    const behavior = resolveBehavior(spec, endpoint);

                    if (behavior.delayMs > 0) {
                         await sleep(behavior.delayMs);
                    }

                    if (shouldFail(behavior.errorRate)) {
                         reply.code(behavior.errorStatus);
                         return behavior.errorResponse;
                    }

                    // 3) Template rendering using request context
                    const params = asRecord(req.params);
                    const query = asRecord(req.query);
                    const body = req.body;

                    const rendered = renderTemplate(endpoint.response, { params, query, body });

                    reply.code(endpoint.status ?? 200);
                    return rendered;
               }
          });

          app.log.info(
               `Registered ${endpoint.method} ${endpoint.path} -> ${endpoint.status} (delay=${endpoint.delayMs ?? spec.settings.delayMs}ms, errorRate=${endpoint.errorRate ?? spec.settings.errorRate})`
          );
     }
}