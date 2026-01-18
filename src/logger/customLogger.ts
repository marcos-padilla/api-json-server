import type { FastifyBaseLogger } from "fastify";
import pino from "pino";
import type { LoggerOptions } from "./types.js";
import { formatStatusCode, formatMethod, formatResponseTime, formatTimestamp, formatLogLevel } from "./formatters.js";

/**
 * Create a custom logger for the mock server.
 */
export function createLogger(options: LoggerOptions): FastifyBaseLogger {
     if (!options.enabled) {
          return pino({ level: "silent" });
     }

     if (options.format === "json") {
          return pino({
               level: options.level,
               timestamp: pino.stdTimeFunctions.isoTime
          });
     }

     // Pretty format with custom output (simplified to avoid serialization issues in tests)
     return pino({
          level: options.level,
          transport: {
               target: "pino-pretty",
               options: {
                    colorize: true,
                    translateTime: "HH:MM:ss",
                    ignore: "pid,hostname",
                    messageFormat: "{msg}"
               }
          }
     });
}

/**
 * Format and log a request/response pair.
 */
export function logRequest(
     logger: FastifyBaseLogger,
     method: string,
     url: string,
     statusCode: number,
     responseTime: number
): void {
     const formattedMethod = formatMethod(method);
     const formattedStatus = formatStatusCode(statusCode);
     const formattedTime = formatResponseTime(responseTime);

     logger.info(`${formattedMethod} ${url} ${formattedStatus} ${formattedTime}`);
}

/**
 * Log server startup.
 */
export function logServerStart(logger: FastifyBaseLogger, port: number, specPath: string): void {
     logger.info(`🚀 Mock server running on http://localhost:${port}`);
     logger.info(`📄 Spec: ${specPath}`);
     logger.info(`📖 Docs: http://localhost:${port}/docs`);
}

/**
 * Log server reload.
 */
export function logServerReload(logger: FastifyBaseLogger, success: boolean, error?: string): void {
     if (success) {
          logger.info("✅ Spec reloaded successfully");
     } else {
          logger.error(`❌ Reload failed: ${error}`);
     }
}

/**
 * Log endpoint registration.
 */
export function logEndpointRegistered(
     logger: FastifyBaseLogger,
     method: string,
     path: string,
     status?: number
): void {
     const formattedMethod = formatMethod(method);
     const statusInfo = status ? ` → ${status}` : "";
     logger.debug(`Registered ${formattedMethod} ${path}${statusInfo}`);
}
