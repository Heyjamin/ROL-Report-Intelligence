import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ReportFileInfo, ReportSource } from './report-source.interface';

const REPORT_EXT = new Set(['.csv', '.xlsx', '.xls']);

export class LocalFolderSource implements ReportSource {
  readonly sourceType = 'local';

  constructor(private readonly folderPath: string) {}

  async listReports(): Promise<ReportFileInfo[]> {
    if (!fs.existsSync(this.folderPath)) {
      return [];
    }
    const entries = fs.readdirSync(this.folderPath);
    const files = entries
      .filter((n) => REPORT_EXT.has(path.extname(n).toLowerCase()))
      .map((name) => {
        const full = path.join(this.folderPath, name);
        const stat = fs.statSync(full);
        return {
          name,
          path: full,
          size: stat.size,
          modifiedAt: stat.mtime,
        };
      });

    // Prefer CSV when both CSV and Excel exist for the same base name
    const byBase = new Map<string, ReportFileInfo[]>();
    for (const f of files) {
      const base = path.basename(f.name, path.extname(f.name)).toLowerCase();
      const list = byBase.get(base) || [];
      list.push(f);
      byBase.set(base, list);
    }

    const selected: ReportFileInfo[] = [];
    for (const list of byBase.values()) {
      const csv = list.find((f) => f.name.toLowerCase().endsWith('.csv'));
      if (csv) selected.push(csv);
      else selected.push(...list);
    }

    return selected.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** All report files on disk (including skipped Excel duplicates). */
  listAllOnDisk(): ReportFileInfo[] {
    if (!fs.existsSync(this.folderPath)) return [];
    return fs
      .readdirSync(this.folderPath)
      .filter((n) => REPORT_EXT.has(path.extname(n).toLowerCase()))
      .map((name) => {
        const full = path.join(this.folderPath, name);
        const stat = fs.statSync(full);
        return {
          name,
          path: full,
          size: stat.size,
          modifiedAt: stat.mtime,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async readFile(file: ReportFileInfo): Promise<Buffer> {
    return fs.readFileSync(file.path);
  }

  computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
