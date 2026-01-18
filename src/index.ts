#!/usr/bin/env node

import { Command } from "commander";
import { watch } from "node:fs";

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
     .action(async (opts: { port: string; spec: string, watch: boolean }) => {
          const port = Number(opts.port);

          if (!Number.isFinite(port) || port <= 0) {
               console.error(`Invalid port: ${opts.port}`);
               process.exit(1);
          }

          const specPath = opts.spec;

          const { loadSpecFromFile } = await import("./loadSpec.js");
          const { buildServer } = await import("./server.js");

          let app = null as null | import("fastify").FastifyInstance;
          let isReloading = false;
          let debounceTimer: NodeJS.Timeout | null = null;

          async function startWithSpec() {
               const loadedAt = new Date().toISOString();

               const spec = await loadSpecFromFile(specPath);
               console.log(`Loaded spec v${spec.version} with ${spec.endpoints.length} endpoint(s).`);

               const nextApp = buildServer(spec, { specPath, loadedAt });
               try {
                    await nextApp.listen({ port, host: "0.0.0.0" });
               } catch (err) {
                    nextApp.log.error(err);
                    throw err;
               }

               nextApp.log.info(`Mock server running on http://localhost:${port}`);
               nextApp.log.info(`Spec: ${specPath} (loadedAt=${loadedAt})`);

               return nextApp;
          }

          async function reload() {
               if (isReloading) return;
               isReloading = true;

               try {
                    console.log("Reloading spec...");

                    // 1) Stop accepting requests on the old server FIRST
                    if (app) {
                         console.log("Closing current server...");
                         await app.close();
                         console.log("Current server closed.");
                         app = null;
                    }

                    // 2) Start a new server on the same port with the updated spec
                    app = await startWithSpec();

                    console.log("Reload complete.");
               } catch (err) {
                    console.error("Reload failed.");

                    // At this point the old server may already be closed. We want visibility.
                    console.error(String(err));

                    // Optional: try to start again to avoid being down
                    try {
                         if (!app) {
                              console.log("Attempting to start server again after reload failure...");
                              app = await startWithSpec();
                              console.log("Recovery start succeeded.");
                         }
                    } catch (err2) {
                         console.error("Recovery start failed. Server is down until next successful reload.");
                         console.error(String(err2));
                    }
               } finally {
                    isReloading = false;
               }
          }

          // Initial start
          try {
               app = await startWithSpec();
          } catch (err) {
               console.error(String(err));
               process.exit(1);
          }

          // Watch spec for changes
          if (opts.watch) {
               console.log(`Watching spec file for changes: ${specPath}`);

               // fs.watch emits multiple events; debounce to avoid rapid reload loops
               watch(specPath, () => {
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                         void reload();
                    }, 200);
               });
          } else {
               console.log("Watch disabled (--no-watch).");
          }
     });

program.parse(process.argv);
