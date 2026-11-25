import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('rol_forecast_results')
@Index(['itemCode', 'periodKey'])
export class ForecastResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_code', type: 'varchar', length: 32 })
  itemCode: string;

  @Column({ name: 'period_key', type: 'varchar', length: 7, nullable: true })
  periodKey: string | null;

  @Column({ type: 'varchar', length: 32 })
  method: string;

  @Column({ name: 'horizon_months', type: 'int', default: 1 })
  horizonMonths: number;

  @Column({
    name: 'point_forecast',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  pointForecast: number | null;

  @Column({
    name: 'lower_band',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  lowerBand: number | null;

  @Column({
    name: 'upper_band',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  upperBand: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  confidence: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
