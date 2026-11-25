import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Permission,
  Role,
  RolePermission,
  SystemConfig,
  User,
  UserRole,
} from '../entities';
import { resolveReportsPath } from '../common/utils/paths';

const PERMISSIONS: { code: string; name: string }[] = [
  { code: 'users:read', name: 'Read users' },
  { code: 'users:write', name: 'Manage users' },
  { code: 'roles:read', name: 'Read roles' },
  { code: 'audit:read', name: 'Read audit log' },
  { code: 'config:read', name: 'Read system config' },
  { code: 'config:write', name: 'Update system config' },
  { code: 'inventory:read', name: 'Read inventory' },
  { code: 'dashboard:read', name: 'Read dashboard' },
  { code: 'reports:read', name: 'Read reports' },
  { code: 'exports:excel', name: 'Export Excel' },
  { code: 'exports:pdf', name: 'Export PDF' },
  { code: 'ingestion:sync', name: 'Trigger ingestion sync' },
  { code: 'ingestion:read', name: 'Read ingestion status' },
  { code: 'assistant:query', name: 'Query assistant' },
  { code: 'forecasts:read', name: 'Read forecasts' },
];

const ROLE_DEFS: {
  code: string;
  name: string;
  permissions: string[] | '*';
}[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    permissions: '*',
  },
  {
    code: 'ADMIN',
    name: 'Administrator',
    permissions: [
      'users:read',
      'users:write',
      'roles:read',
      'audit:read',
      'config:read',
      'config:write',
      'inventory:read',
      'dashboard:read',
      'reports:read',
      'exports:excel',
      'exports:pdf',
      'ingestion:sync',
      'ingestion:read',
      'assistant:query',
      'forecasts:read',
    ],
  },
  {
    code: 'MANAGEMENT',
    name: 'Management',
    permissions: [
      'inventory:read',
      'dashboard:read',
      'reports:read',
      'exports:excel',
      'exports:pdf',
      'assistant:query',
      'forecasts:read',
      'ingestion:read',
    ],
  },
  {
    code: 'ANALYST',
    name: 'Analyst',
    permissions: [
      'inventory:read',
      'dashboard:read',
      'reports:read',
      'exports:excel',
      'exports:pdf',
      'assistant:query',
      'forecasts:read',
      'ingestion:read',
      'ingestion:sync',
    ],
  },
  {
    code: 'VIEWER',
    name: 'Viewer',
    permissions: [
      'inventory:read',
      'dashboard:read',
      'reports:read',
      'forecasts:read',
    ],
  },
];

const CONFIG_DEFAULTS: { key: string; value: string; description: string }[] = [
  {
    key: 'REPORTS_PATH',
    value: '',
    description: 'Local folder for Re-Order Report CSVs',
  },
  {
    key: 'CRITICAL_RATIO',
    value: '0.5',
    description: 'stock/ROL below this → CRITICAL',
  },
  {
    key: 'APPROACH_RATIO',
    value: '1.1',
    description: 'stock/ROL below this (and >=1) → APPROACHING_ROL',
  },
  {
    key: 'EXCESS_RATIO',
    value: '2.0',
    description: 'stock/ROL at or above → EXCESS',
  },
  {
    key: 'VOLATILITY_RATIO',
    value: '0.35',
    description: 'stdev/mean threshold for high volatility',
  },
  {
    key: 'TREND_WINDOW',
    value: '3',
    description: 'Periods for continuous trend detection',
  },
  {
    key: 'GRAPH_TENANT_ID',
    value: '',
    description: 'Microsoft Graph tenant id (OneDrive)',
  },
  {
    key: 'GRAPH_CLIENT_ID',
    value: '',
    description: 'Microsoft Graph client id',
  },
  {
    key: 'GRAPH_CLIENT_SECRET',
    value: '',
    description: 'Microsoft Graph client secret',
  },
  {
    key: 'ONEDRIVE_FOLDER_PATH',
    value: '',
    description: 'OneDrive folder path for reports',
  },
  {
    key: 'INGESTION_SOURCE',
    value: 'local',
    description: 'local | onedrive',
  },
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole) private readonly urRepo: Repository<UserRole>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  async onModuleInit() {
    const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
    const force = process.env.SEED_ON_START === 'true';
    if (dbType !== 'sqlite' && !force) {
      this.logger.log(
        'Skipping seed (non-sqlite). Set SEED_ON_START=true to seed Oracle.',
      );
      return;
    }
    await this.seed();
  }

  async seed() {
    this.logger.log('Seeding roles, permissions, admin, system config…');

    const permMap = new Map<string, Permission>();
    for (const p of PERMISSIONS) {
      let row = await this.permRepo.findOne({ where: { code: p.code } });
      if (!row) {
        row = await this.permRepo.save(this.permRepo.create(p));
      }
      permMap.set(p.code, row);
    }

    const roleMap = new Map<string, Role>();
    for (const def of ROLE_DEFS) {
      let role = await this.roleRepo.findOne({ where: { code: def.code } });
      if (!role) {
        role = await this.roleRepo.save(
          this.roleRepo.create({
            code: def.code,
            name: def.name,
            description: def.name,
          }),
        );
      }
      roleMap.set(def.code, role);

      const codes =
        def.permissions === '*'
          ? PERMISSIONS.map((x) => x.code)
          : def.permissions;
      for (const code of codes) {
        const perm = permMap.get(code);
        if (!perm) continue;
        const existing = await this.rpRepo.findOne({
          where: { role: { id: role.id }, permission: { id: perm.id } },
          relations: ['role', 'permission'],
        });
        if (!existing) {
          await this.rpRepo.save(
            this.rpRepo.create({ role, permission: perm }),
          );
        }
      }
    }

    let admin = await this.userRepo.findOne({ where: { username: 'admin' } });
    if (!admin) {
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      admin = await this.userRepo.save(
        this.userRepo.create({
          username: 'admin',
          passwordHash,
          displayName: 'System Administrator',
          email: 'admin@leco.local',
          isActive: true,
        }),
      );
      const superRole = roleMap.get('SUPER_ADMIN')!;
      await this.urRepo.save(
        this.urRepo.create({ user: admin, role: superRole }),
      );
      this.logger.log('Created admin user (admin / Admin@123)');
    }

    const reportsPath =
      process.env.REPORTS_PATH || resolveReportsPath(null);

    for (const cfg of CONFIG_DEFAULTS) {
      let row = await this.configRepo.findOne({ where: { key: cfg.key } });
      const value =
        cfg.key === 'REPORTS_PATH'
          ? process.env.REPORTS_PATH || reportsPath
          : cfg.value;
      if (!row) {
        await this.configRepo.save(
          this.configRepo.create({
            key: cfg.key,
            value,
            description: cfg.description,
          }),
        );
      } else if (cfg.key === 'REPORTS_PATH' && !row.value) {
        row.value = value;
        await this.configRepo.save(row);
      }
    }

    this.logger.log(`REPORTS_PATH → ${reportsPath}`);
    this.logger.log('Seed complete');
  }
}
