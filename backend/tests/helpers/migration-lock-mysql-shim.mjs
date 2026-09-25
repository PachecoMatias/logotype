import process from 'node:process';

import mysql from 'mysql2/promise';

const forcedLockResult = JSON.parse(process.env.MIGRATION_TEST_GET_LOCK_RESULT);

function createPool(...arguments_) {
  const pool = mysql.createPool(...arguments_);
  const getConnection = pool.getConnection.bind(pool);

  pool.getConnection = async (...connectionArguments) => {
    const connection = await getConnection(...connectionArguments);
    const execute = connection.execute.bind(connection);

    connection.execute = async (statement, values) => {
      if (statement === 'SELECT GET_LOCK(?, 10) AS acquired') {
        return [[{ acquired: forcedLockResult }], undefined];
      }

      return execute(statement, values);
    };

    return connection;
  };

  return pool;
}

export default {
  ...mysql,
  createPool,
};
