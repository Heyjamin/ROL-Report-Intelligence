import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('rol_monthly_inventory_snapshots')
@Unique(['itemCode', 'periodKey'])
@Index(['periodKey'])
@Index(['itemCode'])
export class MonthlyInventorySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_code', type: 'varchar', length: 32 })
  itemCode: string;

  @Column({ name: 'period_key', type: 'varchar', length: 7 })
  periodKey: string;

  @Column({ name: 'run_date', type: 'date', nullable: true })
  runDate: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  uom: string | null;

  @Column({ name: 'item_type', type: 'varchar', length: 10, nullable: true })
  itemType: string | null;

  @Column({ type: 'int', nullable: true })
  sn: number | null;

  @Column({
    name: 'usage_12m',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  usage12m: number | null;

  @Column({
    name: 'avg_usage_m',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  avgUsageM: number | null;

  @Column({
    name: 'proc_period',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  procPeriod: number | null;

  @Column({
    name: 'safety_margin',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  safetyMargin: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  rol: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  roq: number | null;

  @Column({
    name: 'stock_total',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  stockTotal: number | null;

  @Column({
    name: 'po_ops',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  poOps: number | null;

  @Column({ name: 'reorder_flag', type: 'varchar', length: 3, nullable: true })
  reorderFlag: string | null;

  @Column({
    name: 'avg_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  avgCost: number | null;

  @Column({
    name: 'quot_ops',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  quotOps: number | null;

  @Column({
    name: 'transfer_to_project',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  transferToProject: number | null;

  @Column({
    name: 'final_stock',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  finalStock: number | null;

  @Column({
    name: 'rol_touch',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  rolTouch: number | null;

  @Column({
    name: 'project_req',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  projectReq: number | null;

  @Column({
    name: 'project_quot',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  projectQuot: number | null;

  @Column({
    name: 'project_po',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  projectPo: number | null;

  @Column({
    name: 'actual_req',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  actualReq: number | null;

  @Column({ name: 'notes_raw', type: 'varchar', length: 1000, nullable: true })
  notesRaw: string | null;

  @Column({ name: 'is_partial', type: 'boolean', default: false })
  isPartial: boolean;

  @Column({ name: 'source_report_id', type: 'int', nullable: true })
  sourceReportId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
