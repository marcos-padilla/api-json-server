import * as z from 'zod'

export type Primitive = string | number | boolean;

const PrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

export interface TemplateArray extends Array<TemplateValue> {}

export interface TemplateObject {
     [key: string]: TemplateValue;
}

export type FakerTemplate = {
     __faker: string | { method: string; args?: TemplateValue[] };
};

export type RepeatTemplate = {
     __repeat: {
          min?: number;
          max?: number;
          count?: number;
          template: TemplateValue;
     };
};

export type TemplateValue =
     | Primitive
     | null
     | TemplateArray
     | TemplateObject
     | FakerTemplate
     | RepeatTemplate;

const TemplateValueSchema: z.ZodType<TemplateValue> = z.lazy(() =>
     z.union([
          PrimitiveSchema,
          z.null(),
          z.array(TemplateValueSchema),
          z.object({ __faker: z.string().min(1) }).strict(),
          z
               .object({
                    __faker: z
                         .object({
                              method: z.string().min(1),
                              args: z.array(TemplateValueSchema).optional()
                         })
                         .strict()
               })
               .strict(),
          z
               .object({
                    __repeat: z
                         .object({
                                       min: z.number().int().min(0).optional(),
                              max: z.number().int().min(0).optional(),
                              count: z.number().int().min(0).optional(),
                              template: TemplateValueSchema
                         })
                         .strict()
               })
               .strict(),
          z.record(z.string(), TemplateValueSchema)
     ])
);

export const MatchSchema = z.object({
     query: z.record(z.string(), PrimitiveSchema).optional(),
     // Exact match for top-level body fields only (keeps v1 simple)
     body: z.record(z.string(), PrimitiveSchema).optional(),
     // Header matching (case-insensitive keys)
     headers: z.record(z.string(), z.string()).optional(),
     // Cookie matching
     cookies: z.record(z.string(), z.string()).optional()
});

const DelaySchema = z.union([
     z.number().int().min(0),
     z.object({
          min: z.number().int().min(0),
          max: z.number().int().min(0)
     })
]);

export const VariantSchema = z.object({
     name: z.string().min(1).optional(),
     match: MatchSchema.optional(),

     status: z.number().int().min(100).max(599).optional(),
     response: TemplateValueSchema,
     headers: z.record(z.string(), z.string()).optional(),

     // Simulation overrides per variant (optional)
     delayMs: z.number().int().min(0).optional(),
     delay: DelaySchema.optional(),
     errorRate: z.number().min(0).max(1).optional(),
     errorStatus: z.number().int().min(100).max(599).optional(),
     errorResponse: TemplateValueSchema.optional()
});

export const EndpointSchema = z.object({
     method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
     path: z.string().min(1),

     match: MatchSchema.optional(),
     variants: z.array(VariantSchema).min(1).optional(),

     // Response behavior:
     status: z.number().int().min(200).max(599).default(200),
     response: TemplateValueSchema,
     headers: z.record(z.string(), z.string()).optional(),

     // Per-endpoint CORS override
     cors: z
          .object({
               origin: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
               credentials: z.boolean().optional(),
               methods: z.array(z.string()).optional(),
               allowedHeaders: z.array(z.string()).optional(),
               exposedHeaders: z.array(z.string()).optional(),
               maxAge: z.number().int().optional()
          })
          .optional(),

     // Simulation (optional overrides)
     delayMs: z.number().int().min(0).optional(),
     delay: DelaySchema.optional(),
     errorRate: z.number().min(0).max(1).optional(),
     errorStatus: z.number().int().min(100).max(599).optional(),
     errorResponse: TemplateValueSchema.optional()
})

export const MockSpecSchema = z.object({
     version: z.literal(1),
     settings: z
          .object({
               delayMs: z.number().int().min(0).default(0),
               errorRate: z.number().min(0).max(1).default(0),
               errorStatus: z.number().int().min(100).max(599).default(500),
               errorResponse: TemplateValueSchema.default({ error: "Mock error" }),
               fakerSeed: z.number().int().min(0).optional(),
               cors: z
                    .object({
                         origin: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
                         credentials: z.boolean().optional(),
                         methods: z.array(z.string()).optional(),
                         allowedHeaders: z.array(z.string()).optional(),
                         exposedHeaders: z.array(z.string()).optional(),
                         maxAge: z.number().int().optional()
                    })
                    .optional()
          })
          .default({ delayMs: 0, errorRate: 0, errorStatus: 500, errorResponse: { error: "Mock error" } }),
     endpoints: z.array(EndpointSchema).min(1)
})

export type MockSpecInferSchema = z.infer<typeof MockSpecSchema>;
export type EndpointSpecInferSchema = z.infer<typeof EndpointSchema>;
export type VariantSpecInferSchema = z.infer<typeof VariantSchema>;