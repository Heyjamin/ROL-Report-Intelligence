import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuditModule } from './audit/audit.module';
import { SystemModule } from './system/system.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { PeriodsModule } from './periods/periods.module';
import { InventoryModule } from './inventory/inventory.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RiskModule } from './risk/risk.module';
import { ReportsModule } from './reports/reports.module';
import { ExportsModule } from './exports/exports.module';
import { AssistantModule } from './assistant/assistant.module';
import { ForecastsModule } from './forecasts/forecasts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AuditModule,
    SystemModule,
    IngestionModule,
    PeriodsModule,
    InventoryModule,
    DashboardModule,
    RiskModule,
    ReportsModule,
    ExportsModule,
    AssistantModule,
    ForecastsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
