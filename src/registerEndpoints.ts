import type { FastifyInstance } from 'fastify'
import type { MockSpecInferSchema, EndpointSpecInferSchema } from './spec.js'


function normalizeMethod(method: EndpointSpecInferSchema["method"]): Lowercase<EndpointSpecInferSchema["method"]> {
     return method.toLowerCase() as Lowercase<EndpointSpecInferSchema["method"]>;
}

export function registerEndpoints(app: FastifyInstance, spec: MockSpecInferSchema): void {
     for (const endpoint of spec.endpoints) {
          const method = normalizeMethod(endpoint.method)
          const path = endpoint.path

          app.route({
               method: endpoint.method,
               url: path,
               handler: async (_req, reply) => {
                    reply.code(endpoint.status ?? 200);
                    return endpoint.response;
               }
          })
     }
}