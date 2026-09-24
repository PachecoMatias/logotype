import 'dotenv/config';

import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']).default('development');
const portSchema = z.coerce.number().int().min(1).max(65535);
const connectionLimitSchema = z.coerce.number().int().positive();
const requiredStringSchema = z.string().trim().min(1);

const commonSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: portSchema.default(3000),
  MYSQL_CONNECTION_LIMIT: connectionLimitSchema.default(10),
});

const applicationDatabaseSchema = z.object({
  MYSQL_HOST: requiredStringSchema,
  MYSQL_PORT: portSchema.default(3306),
  MYSQL_USER: requiredStringSchema,
  MYSQL_PASSWORD: z.string(),
  MYSQL_DATABASE: requiredStringSchema,
});

const testDatabaseSchema = z.object({
  MYSQL_DATABASE: requiredStringSchema,
  MYSQL_TEST_HOST: requiredStringSchema,
  MYSQL_TEST_PORT: portSchema.default(3306),
  MYSQL_TEST_USER: requiredStringSchema,
  MYSQL_TEST_PASSWORD: z.string(),
  MYSQL_TEST_DATABASE: requiredStringSchema.refine((name) => name.endsWith('_test'), {
    message: 'MYSQL_TEST_DATABASE must end in _test',
  }),
  TEST_DB_RESET_ALLOWED: z.literal('true', {
    error: 'TEST_DB_RESET_ALLOWED must equal true for test database cleanup',
  }),
});

function formatEnvironmentError(error) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
}

function parseSchema(schema, environment) {
  const result = schema.safeParse(environment);

  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${formatEnvironmentError(result.error)}`);
  }

  return result.data;
}

export function parseEnvironment(environment = process.env) {
  const common = parseSchema(commonSchema, environment);

  if (common.NODE_ENV === 'test') {
    const testDatabase = parseSchema(testDatabaseSchema, environment);

    if (testDatabase.MYSQL_TEST_DATABASE === testDatabase.MYSQL_DATABASE) {
      throw new Error(
        'Invalid environment configuration: MYSQL_TEST_DATABASE must differ from MYSQL_DATABASE',
      );
    }

    return {
      environment: common.NODE_ENV,
      host: common.HOST,
      port: common.PORT,
      database: {
        host: testDatabase.MYSQL_TEST_HOST,
        port: testDatabase.MYSQL_TEST_PORT,
        user: testDatabase.MYSQL_TEST_USER,
        password: testDatabase.MYSQL_TEST_PASSWORD,
        database: testDatabase.MYSQL_TEST_DATABASE,
        connectionLimit: common.MYSQL_CONNECTION_LIMIT,
      },
      testDatabaseName: testDatabase.MYSQL_TEST_DATABASE,
    };
  }

  const applicationDatabase = parseSchema(applicationDatabaseSchema, environment);

  return {
    environment: common.NODE_ENV,
    host: common.HOST,
    port: common.PORT,
    database: {
      host: applicationDatabase.MYSQL_HOST,
      port: applicationDatabase.MYSQL_PORT,
      user: applicationDatabase.MYSQL_USER,
      password: applicationDatabase.MYSQL_PASSWORD,
      database: applicationDatabase.MYSQL_DATABASE,
      connectionLimit: common.MYSQL_CONNECTION_LIMIT,
    },
  };
}
