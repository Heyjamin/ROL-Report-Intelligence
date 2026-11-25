import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { ALL_ENTITIES } from '../entities';

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();

  if (dbType === 'oracle') {
    const connectString =
      process.env.DB_CONNECT_STRING ||
      `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 1521}/${
        process.env.DB_SERVICE || 'ORCL'
      }`;

    return {
      type: 'oracle',
      // Instant Client Thick mode is initialized in env.ts via ORACLE_CLIENT_LIB_DIR
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 1521),
      serviceName: process.env.DB_SERVICE || 'ORCL',
      schema: process.env.DB_SCHEMA || 'NLECO',
      entities: ALL_ENTITIES,
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
      extra: {
        libDir:
          process.env.ORACLE_CLIENT_LIB_DIR ||
          'C:\\Oracle\\instantclient_19_29',
      },
    };
  }

  // Pure-JS SQLite (sql.js) — no Visual Studio / node-gyp required
  const sqlitePath = path.resolve(
    process.env.SQLITE_PATH || './data/rol.sqlite',
  );
  const dir = path.dirname(sqlitePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return {
    type: 'sqljs',
    location: sqlitePath,
    autoSave: true,
    entities: ALL_ENTITIES,
    synchronize: true,
    logging: process.env.DB_LOGGING === 'true',
  };
}
