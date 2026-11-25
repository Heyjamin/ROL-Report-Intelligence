import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rol_source_reports')
export class SourceReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 1024, nullable: true })
  filePath: string | null;

  @Column({ name: 'file_hash', type: 'varchar', length: 64, unique: true })
  fileHash: string;

  @Column({ name: 'run_date', type: 'date', nullable: true })
  runDate: string | null;

  @Column({ name: 'period_key', type: 'varchar', length: 7, nullable: true })
  periodKey: string | null;

  @Column({ name: 'row_count', type: 'int', default: 0 })
  rowCount: number;

  @Column({
    type: 'varchar',
    length: 32,
    default: 'pending',
  })
  status: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'source_type', type: 'varchar', length: 32, default: 'local' })
  sourceType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
