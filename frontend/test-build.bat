@echo off
echo Testing build...
echo.
cd /d "%~dp0"
call npm run build
echo.
if %ERRORLEVEL% EQU 0 (
  echo ✅ BUILD SUCCESSFUL!
  echo Ready to deploy.
) else (
  echo ❌ BUILD FAILED!
  echo Check errors above.
)
echo.
pause
