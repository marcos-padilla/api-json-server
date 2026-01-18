import type { FastifyInstance } from 'fastify'
import type { MockSpecInferSchema, EndpointSpecInferSchema } from './spec.js'


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


export function registerEndpoints(app: FastifyInstance, spec: MockSpecInferSchema): void {
     for (const endpoint of spec.endpoints) {
          const method = normalizeMethod(endpoint.method)
          const path = endpoint.path

          app.route({
               method: endpoint.method,
               url: endpoint.path,
               handler: async (_req, reply) => {
                    const behavior = resolveBehavior(spec, endpoint);

                    if (behavior.delayMs > 0) {
                         await sleep(behavior.delayMs);
                    }

                    if (shouldFail(behavior.errorRate)) {
                         reply.code(behavior.errorStatus);
                         return behavior.errorResponse;
                    }

                    reply.code(endpoint.status ?? 200);
                    return endpoint.response;
               }
          });

          app.log.info(
               `Registered ${endpoint.method} ${endpoint.path} -> ${endpoint.status} (delay=${endpoint.delayMs ?? spec.settings.delayMs}ms, errorRate=${endpoint.errorRate ?? spec.settings.errorRate})`
          );
     }
}