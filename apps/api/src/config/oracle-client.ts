import * as fs from 'fs';
import * as path from 'path';

/**
 * Enable node-oracledb Thick mode using Oracle Instant Client.
 * Must run before any Oracle connection (TypeORM) is opened.
 *
 * Instant Client path default: C:\Oracle\instantclient_19_29
 * Override with ORACLE_CLIENT_LIB_DIR.
 */
export function initOracleInstantClient(): void {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  if (dbType !== 'oracle') return;

  const libDir =
    process.env.ORACLE_CLIENT_LIB_DIR ||
    process.env.OCI_LIB_DIR ||
    'C:\\Oracle\\instantclient_19_29';

  const resolved = path.resolve(libDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Oracle Instant Client not found at "${resolved}". ` +
        `Install Instant Client or set ORACLE_CLIENT_LIB_DIR.`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const oracledb = require('oracledb') as typeof import('oracledb');

  try {
    oracledb.initOracleClient({ libDir: resolved });
    // Prefer Thick mode explicitly when Instant Client is present
    console.log(`Oracle Instant Client (Thick) initialized: ${resolved}`);
  } catch (err) {
    const msg = (err as Error).message || String(err);
    // Already initialized is OK on hot-reload
    if (/already been initialized|DPI-1013/i.test(msg)) {
      console.log(`Oracle Instant Client already initialized: ${resolved}`);
      return;
    }
    throw new Error(
      `Failed to init Oracle Instant Client at "${resolved}": ${msg}`,
    );
  }
}
