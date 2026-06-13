@echo off
cd /d "%~dp0"
echo Running build...
echo.
npm run build
echo.
echo Build complete or failed - check above
pause
