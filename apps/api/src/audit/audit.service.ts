import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async list(page = 1, pageSize = 50) {
    const take = Math.min(pageSize, 200);
    const skip = (page - 1) * take;
    const [items, total] = await this.auditRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return { items, total, page, pageSize: take };
  }
}
