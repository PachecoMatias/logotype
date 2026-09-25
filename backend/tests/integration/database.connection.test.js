import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabaseClient } from '../../src/config/database.js';
import { parseEnvironment } from '../../src/config/env.js';

test('real MySQL pool uses only the dedicated test database and releases every connection', async () => {
  const configuration = parseEnvironment();

  assert.equal(configuration.environment, 'test');
  assert.equal(configuration.database.database, 'logotype_test');
  assert.notEqual(configuration.database.database, 'logotype');

  const databaseClient = createDatabaseClient();
  const pool = databaseClient.getPool(configuration);
  const getConnection = pool.getConnection.bind(pool);
  const end = pool.end.bind(pool);
  let releaseCount = 0;
  let poolCloseCount = 0;

  pool.getConnection = async () => {
    const connection = await getConnection();
    const release = connection.release.bind(connection);

    connection.release = () => {
      releaseCount += 1;
      return release();
    };

    return connection;
  };
  pool.end = async () => {
    poolCloseCount += 1;
    return end();
  };

  try {
    await databaseClient.pingDatabase(configuration);

    const [rows] = await pool.query('SELECT DATABASE() AS database_name');
    assert.equal(rows[0].database_name, 'logotype_test');

    await databaseClient.withTransaction(configuration, (connection) =>
      connection.query('SELECT 1 AS verified_value'),
    );
    await assert.rejects(
      databaseClient.withTransaction(configuration, async (connection) => {
        await connection.query('SELECT 1 AS verified_value');
        throw new Error('controlled transaction failure');
      }),
      /controlled transaction failure/,
    );
  } finally {
    await databaseClient.closePool();
  }

  assert.equal(releaseCount, 2);
  assert.equal(poolCloseCount, 1);
});
