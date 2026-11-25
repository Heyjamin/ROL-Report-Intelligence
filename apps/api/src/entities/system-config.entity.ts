import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rol_system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'config_key', type: 'varchar', length: 128, unique: true })
  key: string;

  @Column({ name: 'config_value', type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
