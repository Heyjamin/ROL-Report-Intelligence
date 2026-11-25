import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('rol_report_processing_logs')
export class ReportProcessingLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'source_report_id', type: 'int', nullable: true })
  sourceReportId: number | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', length: 32 })
  stage: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'rows_processed', type: 'int', default: 0 })
  rowsProcessed: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
