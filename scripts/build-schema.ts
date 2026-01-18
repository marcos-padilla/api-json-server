import { writeFile } from "node:fs/promises";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MockSpecSchema, type MockSpecInferSchema } from "../src/spec.js";

async function main() {
     const jsonSchema = zodToJsonSchema(MockSpecSchema as any, {
          name: "MockServeSpec"
     });

     await writeFile("mockserve.spec.schema.json", JSON.stringify(jsonSchema, null, 2), "utf-8");
     console.log("Wrote mockserve.spec.schema.json");
}

main().catch((err) => {
     console.error(err);
     process.exit(1);
});
