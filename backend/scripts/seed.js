import { closePool, getPool } from '../src/config/database.js';
import { parseEnvironment } from '../src/config/env.js';
import { seedEquipo } from '../seeds/equipo.seed.js';

async function run() {
  const configuration = parseEnvironment();
  let connection;

  try {
    connection = await getPool(configuration).getConnection();
    await seedEquipo(connection);
    console.log('Canonical team roster seeded successfully');
  } finally {
    try {
      connection?.release();
    } finally {
      await closePool();
    }
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unexpected seed failure';

  console.error(`Seed command failed: ${message}`);
  process.exitCode = 1;
});
