@echo off
cd /d "%~dp0"
echo Removing node_modules and lockfile...
if exist node_modules rmdir /s /q node_modules
if exist apps\api\node_modules rmdir /s /q apps\api\node_modules
if exist apps\web\node_modules rmdir /s /q apps\web\node_modules
if exist package-lock.json del /f /q package-lock.json
echo Installing (no native sqlite build)...
call npm install
if errorlevel 1 (
  echo npm install failed
  exit /b 1
)
echo.
echo OK. Next:
echo   npm run dev:api
echo   npm run dev:web
endlocal
