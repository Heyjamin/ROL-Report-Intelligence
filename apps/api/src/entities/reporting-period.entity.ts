import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('rol_reporting_periods')
@Unique(['periodKey'])
export class ReportingPeriod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'period_key', type: 'varchar', length: 7 })
  periodKey: string;

  @Column({ name: 'run_date', type: 'date', nullable: true })
  runDate: string | null;

  @Column({ name: 'label', type: 'varchar', length: 64, nullable: true })
  label: string | null;

  @Column({ name: 'item_count', type: 'int', default: 0 })
  itemCount: number;

  @Column({ name: 'source_report_id', type: 'int', nullable: true })
  sourceReportId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
