# ROL Inventory Intelligence Platform

Enterprise Re-Order Level (ROL) analytics for Lanka Electricity Company — ingest monthly Re-Order Report CSVs, analyze stock vs ROL, forecast net stock change, and support management decisions.

## Structure

```
apps/
  api/         NestJS API (JWT + RBAC, ingestion, Oracle/SQLite, exports)
  web/         React + Vite + Ant Design + ECharts
  analytics/   FastAPI forecasting sidecar
docs/          Data dictionary, profiling, architecture, calculations, plan
Re-Order Reports/   Source monthly CSVs (July–Sep, November 2026)
```

## Prerequisites

- Node.js 18+
- Python 3.10+ (for analytics)
- Oracle Instant Client (production) **or** SQLite for local development

## Quick start (local SQLite)

```bat
cd /d "D:\MY FILES\LECO HO IT\Project\Re Order Report"
copy .env.example .env
npm install
npm run dev:api
```

In another terminal:

```bat
npm run dev:web
```

Optional analytics:

```bat
cd apps\analytics
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

1. Open http://localhost:5173  
2. Login: **admin** / **Admin@123**  
3. Go to **Processing Monitor** → **Sync Now** to import the four CSVs  
4. Use **Executive Dashboard** and other modules  

## Oracle production

1. Apply `apps/api/sql/oracle_schema.sql` (schema **NLECO**, all tables prefixed `rol_`, e.g. `NLECO.rol_users`).  
2. Set in `.env`:

```
DB_TYPE=oracle
DB_HOST=...
DB_PORT=1521
DB_USER=...
DB_PASSWORD=...
DB_SERVICE=...
DB_SCHEMA=NLECO
ORACLE_CLIENT_LIB_DIR=C:\Oracle\instantclient_19_29
SEED_ON_START=true
REPORTS_PATH=D:\MY FILES\LECO HO IT\Project\Re Order Report\Re-Order Reports
```

3. Ensure Oracle Instant Client is installed at `C:\Oracle\instantclient_19_29` (or set `ORACLE_CLIENT_LIB_DIR`). The API enables **Thick mode** via `oracledb.initOracleClient` on startup.  
4. Optionally add that folder to the system `PATH`.  
5. Start API once to seed roles/admin (then set `SEED_ON_START=false`).

## Default credentials

| User  | Password   | Role         |
|-------|------------|--------------|
| admin | Admin@123  | SUPER_ADMIN  |

Change immediately in production.

## Key docs

- [docs/ROL_INVENTORY_PLATFORM_PLAN.md](docs/ROL_INVENTORY_PLATFORM_PLAN.md)  
- [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md)  
- [docs/DATA_PROFILING.md](docs/DATA_PROFILING.md)  
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)  
- [docs/CALCULATIONS.md](docs/CALCULATIONS.md)  
- [docs/DEVELOPMENT_PROGRESS.md](docs/DEVELOPMENT_PROGRESS.md)  

## Notes

- Primary stock metric: **Stock Total**  
- MoM deltas are **net stock change**, not proven consumption  
- October 2026 is missing from source data — not fabricated  
- OneDrive/Graph ingestion is stubbed (`INGESTION_SOURCE=onedrive` not yet implemented)  
- Entra ID deferred; local JWT + RBAC is active  
