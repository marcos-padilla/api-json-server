import type { FastifyRequest } from "fastify";
import type { Primitive } from "./spec.js";

export type MatchRule = {
     query?: Record<string, Primitive>;
     body?: Record<string, Primitive>;
};

/**
 * Safely coerce a value to a plain object record.
 */
/**
 * Safely coerce a value to a plain object record.
 */
export function toRecord(value: unknown): Record<string, unknown> {
     if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
     return {};
}

/**
 * Check if the request query matches the expected values.
 */
function queryMatches(req: FastifyRequest, expected?: Record<string, Primitive>): boolean {
     if (!expected) return true;
     const query = toRecord(req.query);

     for (const [key, exp] of Object.entries(expected)) {
          const actual = query[key];
          if (Array.isArray(actual)) return false;
          if (String(actual ?? "") !== String(exp)) return false;
     }

     return true;
}

/**
 * Check if the request body matches the expected top-level values.
 */
function bodyMatches(req: FastifyRequest, expected?: Record<string, Primitive>): boolean {
     if (!expected) return true;

     const body = req.body;
     if (!body || typeof body !== "object" || Array.isArray(body)) return false;

     const record = body as Record<string, unknown>;
     for (const [key, exp] of Object.entries(expected)) {
          const actual = record[key];
          if (String(actual ?? "") !== String(exp)) return false;
     }

     return true;
}

/**
 * Check if a request matches query/body rules.
 */
export function matchRequest(req: FastifyRequest, match?: MatchRule): boolean {
     if (!match) return true;
     if (!queryMatches(req, match.query)) return false;
     if (!bodyMatches(req, match.body)) return false;
     return true;
}
