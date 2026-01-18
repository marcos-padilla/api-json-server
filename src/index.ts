#!/usr/bin/env node

import { Command } from "commander";
import { watch } from "node:fs";
import { createLogger, logServerStart, logServerReload } from "./logger/customLogger.js";
import type { LoggerOptions } from "./logger/types.js";

const program = new Command();

program
     .name("mockserve")
     .description("A simple API Mock Server driven by a JSON spec file.")
     .version("0.1.0");

program
     .command("serve")
     .description("Start the mock server.")
     .option("-p, --port <number>", "Port to run the server on", "3000")
     .option("-s, --spec <path>", "Path to the spec JSON file", "mock.spec.json")
     .option("--watch", "Reload when spec file changes", true)
     .option("--no-watch", "Disable reload when spec file changes")
     .option("--base-url <url>", "Public base URL used in OpenAPI servers[] (e.g. https://example.com)")
     .option("--log-format <format>", "Log format: pretty or json", "pretty")
     .option("--log-level <level>", "Log level: trace, debug, info, warn, error, fatal", "info")
     .action(async (opts: { port: string; spec: string; watch: boolean; baseUrl?: string; logFormat: string; logLevel: string }) => {
          await startCommand(opts);
     });

/**
 * Run the mock server CLI command.
 */
async function startCommand(opts: { port: string; spec: string; watch: boolean; baseUrl?: string; logFormat: string; logLevel: string }): Promise<void> {
     const port = Number(opts.port);

     if (!Number.isFinite(port) || port <= 0) {
          console.error(`Invalid port: ${opts.port}`);
          process.exit(1);
     }

     const specPath = opts.spec;

     // Create logger based on CLI options
     const logFormat = opts.logFormat === "json" ? "json" : "pretty";
     const logLevel = ["trace", "debug", "info", "warn", "error", "fatal"].includes(opts.logLevel)
          ? opts.logLevel as LoggerOptions["level"]
          : "info";

     const logger = createLogger({
          enabled: true,
          format: logFormat,
          level: logLevel
     });

     const { loadSpecFromFile } = await import("./loadSpec.js");
     const { buildServer } = await import("./server.js");

     let app = null as null | import("fastify").FastifyInstance;
     let isReloading = false;
     let debounceTimer: NodeJS.Timeout | null = null;

     /**
      * Build and start a server using the current spec file.
      */
     async function startWithSpec() {
          const loadedAt = new Date().toISOString();

          const spec = await loadSpecFromFile(specPath);
          logger.info(`Loaded spec v${spec.version} with ${spec.endpoints.length} endpoint(s).`);

          const nextApp = buildServer(spec, { specPath, loadedAt, baseUrl: opts.baseUrl, logger: true });
          try {
               await nextApp.listen({ port, host: "0.0.0.0" });
          } catch (err) {
               nextApp.log.error(err);
               throw err;
          }

          logServerStart(nextApp.log, port, specPath);

          return nextApp;
     }

     /**
      * Reload the server when the spec changes.
      */
     async function reload() {
          if (isReloading) return;
          isReloading = true;

          try {
               logger.info("Reloading spec...");

               // 1) Stop accepting requests on the old server FIRST
               if (app) {
                    logger.debug("Closing current server...");
                    await app.close();
                    logger.debug("Current server closed.");
                    app = null;
               }

               // 2) Start a new server on the same port with the updated spec
               app = await startWithSpec();

               logServerReload(logger, true);
          } catch (err) {
               const errorMsg = err instanceof Error ? err.message : String(err);
               logServerReload(logger, false, errorMsg);

               // Optional: try to start again to avoid being down
               try {
                    if (!app) {
                         logger.info("Attempting to start server again after reload failure...");
                         app = await startWithSpec();
                         logger.info("Recovery start succeeded.");
                    }
               } catch (err2) {
                    logger.error("Recovery start failed. Server is down until next successful reload.");
                    logger.error(err2);
               }
          } finally {
               isReloading = false;
          }
     }

     // Initial start
     try {
          app = await startWithSpec();
     } catch (err) {
          logger.error(err);
          process.exit(1);
     }

     // Watch spec for changes
     /**
      * Handle file changes with a debounced reload.
      */
     function onSpecChange(): void {
          debounceTimer = scheduleReload(reload, debounceTimer);
     }

     if (opts.watch) {
          logger.info(`Watching spec file for changes: ${specPath}`);

          // fs.watch emits multiple events; debounce to avoid rapid reload loops
          watch(specPath, onSpecChange);
     } else {
          logger.info("Watch disabled (--no-watch).");
     }
}

/**
 * Schedule a debounced reload when the spec changes.
 */
function scheduleReload(reload: () => Promise<void>, debounceTimer: NodeJS.Timeout | null): NodeJS.Timeout {
     if (debounceTimer) clearTimeout(debounceTimer);
     return setTimeout(() => {
          void reload();
     }, 200);
}

program.parse(process.argv);
