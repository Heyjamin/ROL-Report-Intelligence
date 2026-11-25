@echo off
setlocal
cd /d "%~dp0"

echo === ROL Inventory Platform setup ===
if not exist .env (
  copy .env.example .env
  echo Created .env from .env.example
)

echo Installing npm workspaces...
call npm install
if errorlevel 1 (
  echo npm install failed. Install Node.js 18+ and retry.
  exit /b 1
)

echo.
echo Setup complete.
echo.
echo Start API:   npm run dev:api
echo Start Web:   npm run dev:web
echo Login:       admin / Admin@123
echo Then open Processing Monitor and click Sync Now.
echo.
endlocal
