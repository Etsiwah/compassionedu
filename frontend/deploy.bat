@echo off
echo ====================================
echo   Deploying to Vercel Production
echo ====================================
echo.
cd /d "%~dp0"
call npx vercel --prod --yes
echo.
echo ====================================
echo   Deployment complete!
echo ====================================
echo.
pause
