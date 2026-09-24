import mysql from 'mysql2/promise';

export function createDatabaseClient(poolFactory = mysql.createPool) {
  let pool;

  function getPool(configuration) {
    if (!pool) {
      pool = poolFactory({
        ...configuration.database,
        waitForConnections: true,
        timezone: 'Z',
      });
    }

    return pool;
  }

  async function pingDatabase(configuration) {
    await getPool(configuration).query('SELECT 1');
  }

  async function withTransaction(configuration, operation) {
    const connection = await getPool(configuration).getConnection();

    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function closePool() {
    if (pool) {
      const activePool = pool;
      pool = undefined;
      await activePool.end();
    }
  }

  return { closePool, getPool, pingDatabase, withTransaction };
}

const databaseClient = createDatabaseClient();

export const { closePool, getPool, pingDatabase, withTransaction } = databaseClient;
