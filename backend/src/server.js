import http from 'node:http';

import { app } from './app.js';
import { closePool, pingDatabase } from './config/database.js';
import { parseEnvironment } from './config/env.js';

const shutdownTimeoutMilliseconds = 10_000;

async function start() {
  const configuration = parseEnvironment();

  await pingDatabase(configuration);

  const server = http.createServer(app);
  let shuttingDown = false;

  const shutdown = () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    const timeout = setTimeout(() => {
      process.exitCode = 1;
      server.close();
    }, shutdownTimeoutMilliseconds);

    server.close(async () => {
      clearTimeout(timeout);
      await closePool();
      process.exitCode = 0;
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.listen(configuration.port, configuration.host, () => {
    console.log(`Server listening on http://${configuration.host}:${configuration.port}`);
  });
}

start().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unexpected startup failure';

  console.error(`Server startup failed: ${message}`);
  process.exitCode = 1;
});
