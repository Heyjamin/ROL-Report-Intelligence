export type ReportFileInfo = {
  name: string;
  path: string;
  size: number;
  modifiedAt?: Date;
};

export interface ReportSource {
  readonly sourceType: string;
  listReports(): Promise<ReportFileInfo[]>;
  readFile(file: ReportFileInfo): Promise<Buffer>;
  computeHash(buffer: Buffer): string;
}
