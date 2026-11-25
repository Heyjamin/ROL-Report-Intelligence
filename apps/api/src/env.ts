import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import { initOracleInstantClient } from './config/oracle-client';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '../../.env') });

// Instant Client Thick mode — before TypeORM opens Oracle connections
initOracleInstantClient();
