@echo off
echo ========================================
echo Setting up EST Sale Users
echo ========================================
echo.

echo Running PowerShell setup script...
echo If this fails, run PowerShell as Administrator and run:
echo Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0setup-users.ps1"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Setup failed!
    echo Make sure Docker is running and containers are up.
    echo Run: docker-compose up -d
    pause
    exit /b 1
)

pausegit rm setup-users.ps1 setup-users.bat