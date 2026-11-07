@echo off
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js is not installed. Get the LTS version at https://nodejs.org, install it, then double-click this file again. & pause & exit /b 1)
if not exist node_modules (echo First run: installing, takes a minute... & call npm install || (echo Install failed. & pause & exit /b 1))
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
echo Dashboard running at http://localhost:3000 - close this window to stop it.
call npm run dev
