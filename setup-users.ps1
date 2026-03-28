@echo off
echo ========================================
echo Setting up EST Sale Users
echo ========================================
echo.

echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo Running PowerShell setup script...
powershell -ExecutionPolicy Bypass -File setup-users.ps1

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Setup failed!
    echo Make sure Docker is running and containers are up.
    echo Run: docker-compose up -d
    pause
    exit /b 1
)

pause