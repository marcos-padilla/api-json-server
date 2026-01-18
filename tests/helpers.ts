import { readFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { MockSpecSchema, type MockSpecInferSchema } from "../src/spec.js";

/**
 * Load and validate a fixture spec file.
 */
export async function loadFixture(path: string): Promise<MockSpecInferSchema> {
     const raw = await readFile(path, "utf-8");
     const json = JSON.parse(raw) as unknown;
     return MockSpecSchema.parse(json);
}

/**
 * Build a Fastify instance from a fixture spec file.
 */
export async function buildTestServerFromFixture(path: string): Promise<FastifyInstance> {
     const spec = await loadFixture(path);
     return buildServer(spec, { specPath: path, loadedAt: "now" });
}

/**
 * Build a Fastify instance from an in-memory spec object.
 */
export function buildTestServer(spec: MockSpecInferSchema): FastifyInstance {
     return buildServer(spec, { specPath: "inline", loadedAt: "now" });
}
