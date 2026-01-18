#!/usr/bin/env node

import { Command } from "commander";

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
     .action(async (opts: { port: string; spec: string }) => {
          const port = Number(opts.port)
          if (!Number.isFinite(port) || port <= 0) {
               console.error(`Invalid port number ${opts.port}. Please provide a positive integer.`)
               process.exit(1)
          }

          const { buildServer } = await import('./server.js')
          const app = buildServer()

          try {
               await app.listen({ port, host: '0.0.0.0' })
               app.log.info(`Mock server running on http://localhost:${port}`);
               app.log.info(`(Spec loading not implemented yet) spec=${opts.spec}`);
          } catch (err) {
               app.log.error(err);
               process.exit(1);
          }
     });

program.parse(process.argv);
