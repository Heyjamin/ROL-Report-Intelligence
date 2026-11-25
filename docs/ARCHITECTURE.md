# Architecture — ROL Inventory Intelligence Platform

## Overview

Monorepo greenfield application:

- `apps/api` — NestJS REST API, JWT/RBAC, ingestion, Oracle access  
- `apps/web` — React + Vite + TypeScript + Ant Design + ECharts  
- `apps/analytics` — Python FastAPI forecasting sidecar  
- `docs/` — dictionaries, progress, calculations  

Oracle is the system of record. Local CSV folder is the default ingest source; OneDrive/Graph is abstracted for later.

## Runtime topology

```
Browser → apps/web (Vite)
            ↓ REST + JWT
         apps/api (NestJS)
            ↓ SQL          ↓ HTTP
         Oracle DB      apps/analytics (FastAPI)
            ↑
         Re-Order Reports/*.csv (local watcher)
```

## Auth model

1. Local username/password → bcrypt verify  
2. Issue access JWT + refresh JWT  
3. NestJS `RolesGuard` checks permission codes on every protected route  
4. Entra ID deferred; `AuthProvider` interface reserved  

Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGEMENT`, `ANALYST`, `VIEWER`

## Ingestion

`LocalFolderSource` implements `ReportSource`:

- list files, compute SHA-256, download/read path  
- `OneDriveSource` stub implements same interface  

Pipeline: detect → parse → validate → persist → recompute metrics → log

## Data ownership

| Store | Owner |
|-------|-------|
| Historical snapshots | Append-only; admin reprocess only |
| Metrics / alerts | Recomputed from snapshots |
| Forecasts | Analytics service writes via API or shared DB |
| Source CSVs | Remain on disk; DB stores path + hash |

## Security boundaries

- Secrets only in `.env` / server env  
- Frontend receives JWT only  
- Exports check RBAC server-side  
- CSV size and extension validated  

## Dev vs production DB

- Production: Oracle (`DB_TYPE=oracle`)  
- Local bootstrap without Instant Client: `DB_TYPE=sqlite` file DB with identical schema semantics for development/testing  

Both share TypeORM entities.
