import * as z from 'zod'

/**
 * v1 Spec:
 * - endpoints: list of endpoint definitions
 * - Each endpoint has:
 *   - method: HTTP verb
 *   - path: route path (Fastify style, e.g. /users/:id)
 *   - response: static JSON response (for now)
 *   - status: HTTP status code (default 200)
 */
export const EndpointSchema = z.object({
     method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
     path: z.string().min(1),

     // Response behavior:
     status: z.number().int().min(200).max(599).default(200),
     response: z.unknown(),

     // Simulation (optional overrides)
     delayMs: z.number().int().min(0).optional(),
     errorRate: z.number().min(0).max(1).optional(),
     errorStatus: z.number().int().min(100).max(599).optional(),
     errorResponse: z.unknown().optional()
})

export const MockSpecSchema = z.object({
     version: z.literal(1),
     settings: z
          .object({
               delayMs: z.number().int().min(0).default(0),
               errorRate: z.number().min(0).max(1).default(0),
               errorStatus: z.number().int().min(100).max(599).default(500),
               errorResponse: z.unknown().default({ error: "Mock error" })
          })
          .default({ delayMs: 0, errorRate: 0, errorStatus: 500, errorResponse: { error: "Mock error" } }),
     endpoints: z.array(EndpointSchema).min(1)
})

export type MockSpecInferSchema = z.infer<typeof MockSpecSchema>;
export type EndpointSpecInferSchema = z.infer<typeof EndpointSchema>;