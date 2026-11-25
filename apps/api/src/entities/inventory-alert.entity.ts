import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('rol_inventory_alerts')
@Index(['periodKey', 'severity'])
export class InventoryAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_code', type: 'varchar', length: 32 })
  itemCode: string;

  @Column({ name: 'period_key', type: 'varchar', length: 7 })
  periodKey: string;

  @Column({ name: 'alert_type', type: 'varchar', length: 64 })
  alertType: string;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  severity: string;

  @Column({ type: 'varchar', length: 500 })
  message: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
