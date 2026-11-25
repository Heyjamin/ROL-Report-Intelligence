export { User } from './user.entity';
export { Role } from './role.entity';
export { Permission } from './permission.entity';
export { UserRole } from './user-role.entity';
export { RolePermission } from './role-permission.entity';
export { AuditLog } from './audit-log.entity';
export { SystemConfig } from './system-config.entity';
export { SourceReport } from './source-report.entity';
export { ReportProcessingLog } from './report-processing-log.entity';
export { ReportingPeriod } from './reporting-period.entity';
export { InventoryItem } from './inventory-item.entity';
export { MonthlyInventorySnapshot } from './monthly-inventory-snapshot.entity';
export { StockMetric } from './stock-metric.entity';
export { ForecastResult } from './forecast-result.entity';
export { InventoryAlert } from './inventory-alert.entity';

import { User } from './user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { UserRole } from './user-role.entity';
import { RolePermission } from './role-permission.entity';
import { AuditLog } from './audit-log.entity';
import { SystemConfig } from './system-config.entity';
import { SourceReport } from './source-report.entity';
import { ReportProcessingLog } from './report-processing-log.entity';
import { ReportingPeriod } from './reporting-period.entity';
import { InventoryItem } from './inventory-item.entity';
import { MonthlyInventorySnapshot } from './monthly-inventory-snapshot.entity';
import { StockMetric } from './stock-metric.entity';
import { ForecastResult } from './forecast-result.entity';
import { InventoryAlert } from './inventory-alert.entity';

export const ALL_ENTITIES = [
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  AuditLog,
  SystemConfig,
  SourceReport,
  ReportProcessingLog,
  ReportingPeriod,
  InventoryItem,
  MonthlyInventorySnapshot,
  StockMetric,
  ForecastResult,
  InventoryAlert,
];
