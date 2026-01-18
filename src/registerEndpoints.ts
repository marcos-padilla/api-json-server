import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { MockSpecInferSchema, EndpointSpecInferSchema, TemplateValue } from "./spec.js";
import { matchRequest, toRecord } from "./requestMatch.js";
import { createRenderContext, renderTemplateValue } from "./responseRenderer.js";
import { resolveBehavior, shouldFail, sleep, type BehaviorOverrides } from "./behavior.js";

type ResponseSource = {
     status?: number;
     response: TemplateValue;
} & BehaviorOverrides;

/**
 * Select a response source from the first matching variant.
 */
function selectVariant(req: FastifyRequest, endpoint: EndpointSpecInferSchema): ResponseSource | null {
     if (!endpoint.variants || endpoint.variants.length === 0) return null;
     for (const variant of endpoint.variants) {
          if (matchRequest(req, variant.match)) {
               return {
                    status: variant.status,
                    response: variant.response,
                    delayMs: variant.delayMs,
                    errorRate: variant.errorRate,
                    errorStatus: variant.errorStatus,
                    errorResponse: variant.errorResponse
               };
          }
     }
     return null;
}

/**
 * Build a response source from the endpoint itself.
 */
function selectEndpointSource(endpoint: EndpointSpecInferSchema): ResponseSource {
     return {
          status: endpoint.status,
          response: endpoint.response,
          delayMs: endpoint.delayMs,
          errorRate: endpoint.errorRate,
          errorStatus: endpoint.errorStatus,
          errorResponse: endpoint.errorResponse
     };
}

/**
 * Register all endpoints defined in a mock spec.
 */
export function registerEndpoints(app: FastifyInstance, spec: MockSpecInferSchema): void {
     for (const endpoint of spec.endpoints) {
          app.route({
               method: endpoint.method,
               url: endpoint.path,
               handler: buildEndpointHandler(spec, endpoint)
          });

          app.log.info(
               `Registered ${endpoint.method} ${endpoint.path} -> ${endpoint.status} (delay=${endpoint.delayMs ?? spec.settings.delayMs}ms, errorRate=${endpoint.errorRate ?? spec.settings.errorRate})`
          );
     }
}

/**
 * Build a Fastify handler for a single endpoint definition.
 */
function buildEndpointHandler(spec: MockSpecInferSchema, endpoint: EndpointSpecInferSchema) {
     return async (req: FastifyRequest, reply: FastifyReply) => {
          const variant = selectVariant(req, endpoint);

          if (!variant && !matchRequest(req, endpoint.match)) {
               reply.code(404);
               return { error: "No matching mock for request" };
          }

          const source = variant ?? selectEndpointSource(endpoint);
          const behavior = resolveBehavior(spec.settings, endpoint, source);

          if (behavior.delayMs > 0) {
               await sleep(behavior.delayMs);
          }

          const params = toRecord(req.params);
          const query = toRecord(req.query);
          const body = req.body;
          const renderContext = createRenderContext({ params, query, body }, spec.settings.fakerSeed);

          if (shouldFail(behavior.errorRate)) {
               reply.code(behavior.errorStatus);
               return renderTemplateValue(behavior.errorResponse, renderContext);
          }

          const rendered = renderTemplateValue(source.response, renderContext);

          reply.code(source.status ?? endpoint.status ?? 200);
          return rendered;
     };
}