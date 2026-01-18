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
     status: z.number().int().min(200).max(599).default(200),
     response: z.unknown()
})

export const MockSpecSchema = z.object({
     version: z.literal(1),
     endpoints: z.array(EndpointSchema).min(1)
})

export type MockSpecInferSchema = z.infer<typeof MockSpecSchema>;
export type EndpointSpecInferSchema = z.infer<typeof EndpointSchema>;