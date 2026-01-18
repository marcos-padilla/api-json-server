import type { FastifyRequest } from "fastify";
import type { Primitive } from "./spec.js";

export type MatchRule = {
     query?: Record<string, Primitive>;
     body?: Record<string, Primitive>;
     headers?: Record<string, string>;
     cookies?: Record<string, string>;
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
 * Check if the request headers match the expected values (case-insensitive).
 */
function headersMatch(req: FastifyRequest, expected?: Record<string, string>): boolean {
     if (!expected) return true;

     // Normalize header keys to lowercase for case-insensitive matching
     const headers = new Map<string, string>();
     for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === "string") {
               headers.set(key.toLowerCase(), value);
          }
     }

     for (const [key, exp] of Object.entries(expected)) {
          const actual = headers.get(key.toLowerCase());
          if (actual !== exp) return false;
     }

     return true;
}

/**
 * Check if the request cookies match the expected values.
 */
function cookiesMatch(req: FastifyRequest, expected?: Record<string, string>): boolean {
     if (!expected) return true;

     const cookies = (req as FastifyRequest & { cookies?: Record<string, string> }).cookies;
     if (!cookies) return false;

     for (const [key, exp] of Object.entries(expected)) {
          if (cookies[key] !== exp) return false;
     }

     return true;
}

/**
 * Check if a request matches query/body/headers/cookies rules.
 */
export function matchRequest(req: FastifyRequest, match?: MatchRule): boolean {
     if (!match) return true;
     if (!queryMatches(req, match.query)) return false;
     if (!bodyMatches(req, match.body)) return false;
     if (!headersMatch(req, match.headers)) return false;
     if (!cookiesMatch(req, match.cookies)) return false;
     return true;
}
