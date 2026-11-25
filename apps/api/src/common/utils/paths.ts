import * as fs from 'fs';
import * as path from 'path';

/** Resolve default REPORTS_PATH to monorepo Re-Order Reports folder. */
export function resolveReportsPath(configured?: string | null): string {
  if (configured && configured.trim()) {
    return path.resolve(configured.trim());
  }
  const candidates = [
    path.resolve(process.cwd(), '../../Re-Order Reports'),
    path.resolve(process.cwd(), '../Re-Order Reports'),
    path.resolve(process.cwd(), 'Re-Order Reports'),
    path.resolve(__dirname, '../../../../Re-Order Reports'),
    path.resolve(__dirname, '../../../../../Re-Order Reports'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), '../../Re-Order Reports');
}
