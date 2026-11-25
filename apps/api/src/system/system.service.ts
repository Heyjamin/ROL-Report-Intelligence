import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, SystemConfig } from '../entities';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async getAll() {
    const rows = await this.configRepo.find({ order: { key: 'ASC' } });
    return rows.map((r) => ({
      key: r.key,
      value: r.value,
      description: r.description,
      updatedAt: r.updatedAt,
    }));
  }

  async getMap(): Promise<Record<string, string>> {
    const rows = await this.configRepo.find();
    const map: Record<string, string> = {};
    for (const r of rows) {
      if (r.value != null) map[r.key] = r.value;
    }
    return map;
  }

  async get(key: string): Promise<string | null> {
    const row = await this.configRepo.findOne({ where: { key } });
    return row?.value ?? null;
  }

  async patch(
    values: Record<string, string | null>,
    actor?: { id: number; username: string },
  ) {
    const updated: string[] = [];
    for (const [key, value] of Object.entries(values)) {
      let row = await this.configRepo.findOne({ where: { key } });
      if (!row) {
        row = this.configRepo.create({ key, value, description: null });
      } else {
        row.value = value;
      }
      await this.configRepo.save(row);
      updated.push(key);
    }
    await this.auditRepo.save(
      this.auditRepo.create({
        userId: actor?.id ?? null,
        username: actor?.username ?? null,
        action: 'UPDATE',
        resource: 'system_config',
        details: JSON.stringify({ keys: updated }),
      }),
    );
    return this.getAll();
  }

  async require(key: string): Promise<string> {
    const v = await this.get(key);
    if (v == null) throw new NotFoundException(`Config ${key} not found`);
    return v;
  }
}
