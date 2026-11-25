import { NotImplementedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ReportFileInfo, ReportSource } from './report-source.interface';

/**
 * Stub for future Microsoft Graph / OneDrive ingestion.
 * Configure GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET,
 * ONEDRIVE_FOLDER_PATH via system config when implementing.
 */
export class OneDriveSource implements ReportSource {
  readonly sourceType = 'onedrive';

  async listReports(): Promise<ReportFileInfo[]> {
    throw new NotImplementedException(
      'OneDrive/Graph ingestion is not implemented yet. Set INGESTION_SOURCE=local.',
    );
  }

  async readFile(_file: ReportFileInfo): Promise<Buffer> {
    throw new NotImplementedException(
      'OneDrive/Graph ingestion is not implemented yet.',
    );
  }

  computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
