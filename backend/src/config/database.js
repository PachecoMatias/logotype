import mysql from 'mysql2/promise';

let pool;

export function getPool(configuration) {
  if (!pool) {
    pool = mysql.createPool({
      ...configuration.database,
      waitForConnections: true,
      timezone: 'Z',
    });
  }

  return pool;
}

export async function pingDatabase(configuration) {
  await getPool(configuration).query('SELECT 1');
}

export async function withTransaction(configuration, operation) {
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

export async function closePool() {
  if (pool) {
    const activePool = pool;
    pool = undefined;
    await activePool.end();
  }
}
