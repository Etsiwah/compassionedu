@echo off
echo Fixing curly apostrophes in Help files...

powershell -Command "(Get-Content 'src\pages\admin\HelpSection.jsx' -Raw -Encoding UTF8) -replace [char]0x2019, [char]0x0027 | Set-Content 'src\pages\admin\HelpSection.jsx' -Encoding UTF8 -NoNewline"

powershell -Command "(Get-Content 'src\pages\staff\HelpSection.jsx' -Raw -Encoding UTF8) -replace [char]0x2019, [char]0x0027 | Set-Content 'src\pages\staff\HelpSection.jsx' -Encoding UTF8 -NoNewline"

powershell -Command "(Get-Content 'src\pages\student\HelpSection.jsx' -Raw -Encoding UTF8) -replace [char]0x2019, [char]0x0027 | Set-Content 'src\pages\student\HelpSection.jsx' -Encoding UTF8 -NoNewline"

echo Done! All curly apostrophes fixed.
echo.
echo Now run: npm run build
pause
