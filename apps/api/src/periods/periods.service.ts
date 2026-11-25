import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportingPeriod } from '../entities';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(ReportingPeriod)
    private readonly periodRepo: Repository<ReportingPeriod>,
  ) {}

  findAll() {
    return this.periodRepo.find({ order: { periodKey: 'ASC' } });
  }

  async latest(): Promise<string | null> {
    const rows = await this.periodRepo.find({
      order: { periodKey: 'DESC' },
      take: 1,
    });
    return rows[0]?.periodKey ?? null;
  }
}
