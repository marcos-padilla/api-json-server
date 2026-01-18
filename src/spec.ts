import * as z from 'zod'

const Primitive = z.union([z.string(), z.number(), z.boolean()]);

export const MatchSchema = z.object({
     query: z.record(z.string(), Primitive).optional(),
     // Exact match for top-level body fields only (keeps v1 simple)
     body: z.record(z.string(), Primitive).optional()
});

export const VariantSchema = z.object({
     name: z.string().min(1).optional(),
     match: MatchSchema.optional(),

     status: z.number().int().min(100).max(599).optional(),
     response: z.unknown(),

     // Simulation overrides per variant (optional)
     delayMs: z.number().int().min(0).optional(),
     errorRate: z.number().min(0).max(1).optional(),
     errorStatus: z.number().int().min(100).max(599).optional(),
     errorResponse: z.unknown().optional()
});

export const EndpointSchema = z.object({
     method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
     path: z.string().min(1),

     match: MatchSchema.optional(),
     variants: z.array(VariantSchema).min(1).optional(),

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
export type VariantSpecInferSchema = z.infer<typeof VariantSchema>;