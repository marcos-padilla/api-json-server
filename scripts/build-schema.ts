import { writeFile } from "node:fs/promises";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MockSpecSchema } from "../src/spec.js";

/**
 * Build the JSON schema file from the Zod spec.
 */
async function main() {
     const schema = MockSpecSchema as unknown as Parameters<typeof zodToJsonSchema>[0];
     const jsonSchema = zodToJsonSchema(schema, {
          name: "MockServeSpec"
     });

     await writeFile("mockserve.spec.schema.json", JSON.stringify(jsonSchema, null, 2), "utf-8");
     console.log("Wrote mockserve.spec.schema.json");
}

main().catch((err) => {
     console.error(err);
     process.exit(1);
});
