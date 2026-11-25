import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rol_stock_metrics')
@Unique(['itemCode', 'periodKey'])
@Index(['periodKey'])
@Index(['stockStatus'])
export class StockMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_code', type: 'varchar', length: 32 })
  itemCode: string;

  @Column({ name: 'period_key', type: 'varchar', length: 7 })
  periodKey: string;

  @Column({
    name: 'stock_total',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  stockTotal: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  rol: number | null;

  @Column({
    name: 'stock_delta',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  stockDelta: number | null;

  @Column({
    name: 'stock_delta_pct',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  stockDeltaPct: number | null;

  @Column({
    name: 'gap_qty',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  gapQty: number | null;

  @Column({
    name: 'gap_value',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  gapValue: number | null;

  @Column({
    name: 'rol_ratio',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  rolRatio: number | null;

  @Column({ name: 'stock_status', type: 'varchar', length: 32 })
  stockStatus: string;

  @Column({ name: 'trend_label', type: 'varchar', length: 48, nullable: true })
  trendLabel: string | null;

  @Column({
    name: 'volatility',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  volatility: number | null;

  @Column({ name: 'is_high_volatility', type: 'boolean', default: false })
  isHighVolatility: boolean;

  @Column({ name: 'recommended_action', type: 'varchar', length: 255, nullable: true })
  recommendedAction: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
