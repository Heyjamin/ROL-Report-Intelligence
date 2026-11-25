# Development Progress — ROL Inventory Intelligence Platform

**Updated:** 2026-11-25  
**Status:** All planned MVP todos implemented

## Checklist

| ID | Item | Status |
|----|------|--------|
| docs-stage1 | DATA_DICTIONARY, DATA_PROFILING, ARCHITECTURE, CALCULATIONS | Done |
| scaffold | NestJS + React Vite + Python analytics + env + progress | Done |
| oracle-schema | Oracle DDL + TypeORM entities + SQLite seed RBAC/admin | Done |
| auth-rbac | Local JWT, RolesGuard, users/roles/audit APIs | Done |
| ingestion | CSV normalizer, local sync, processing monitor, cron | Done |
| metrics-apis | Dashboard, explorer, risk, monthly insight APIs | Done |
| ui-dashboards | All 14 application pages | Done |
| exports | Excel + PDF monthly insight + inventory export | Done |
| forecasting | Python FastAPI + Nest proxy/fallback | Done |
| ai-assistant | DB-grounded rule-based `/assistant/query` | Done |
| onedrive-stub | `ReportSource` + `OneDriveSource` stub + GRAPH_* config | Done |

## How to run

See root [README.md](../README.md) or `SETUP.bat`.

- Admin: `admin` / `Admin@123`  
- Sync CSVs from Processing Monitor after first login  

## Known limitations

- Shell/`npm install` must be run on the developer machine (agent shell was unavailable).  
- OneDrive Graph client not implemented (interface + config only).  
- Entra ID deferred.  
- October 2026 source gap remains.  
- Forecasts labeled as net-stock-change estimates; low confidence with 4 periods.  
