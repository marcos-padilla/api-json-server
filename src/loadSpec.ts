import { readFile } from 'node:fs/promises'
import { MockSpecSchema, type MockSpecInferSchema } from './spec.js'

export async function loadSpecFromFile(specPath: string): Promise<MockSpecInferSchema> {
     let raw: string
     try {
          raw = await readFile(specPath, 'utf-8')
     } catch (err) {
          throw new Error(`Failed to read spec file ${specPath}: ${err instanceof Error ? err.message : String(err)}`)
     }

     let json: unknown
     try {
          json = JSON.parse(raw)
     } catch (err) {
          throw new Error(`Failed to parse spec file ${specPath}: ${err instanceof Error ? err.message : String(err)}`)
     }

     const parsed = MockSpecSchema.safeParse(json)
     if (!parsed.success) {
          const issues = parsed.error.issues
               .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
               .join("\n")
          throw new Error(`Invalid spec file ${specPath}: ${issues}`)
     }

     return parsed.data
}