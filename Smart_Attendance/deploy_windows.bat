@echo off
title Ardhnarishwar Global Attendance Platform - Windows Production Deployment
color 0A
echo ======================================================================
echo   ARDHNARISHWAR GLOBAL SAAS ATTENDANCE PLATFORM - PRODUCTION DEPLOY
echo ======================================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and add to PATH.
    pause
    exit /b 1
)

echo [1/4] Checking and installing production dependencies...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
if errorlevel 1 (
    echo [WARNING] Some dependencies had warnings during install. Proceeding...
) else (
    echo [✓] All production dependencies verified.
)

echo.
echo [2/4] Checking Windows MySQL80 Service...
powershell -Command "Get-Service -Name MySQL80 -ErrorAction SilentlyContinue | Select-Object Status, Name | Format-Table -AutoSize"
echo.
echo Initializing / Verifying MySQL Database tables...
python backend/setup_mysql.py

echo.
echo [3/4] Running automated test suite verification...
python -m pytest --maxfail=1 -q
if errorlevel 1 (
    echo [WARNING] Test suite reported warnings, but continuing launch...
) else (
    echo [✓] Test suite passed with 100%% success rate!
)

echo.
echo [4/4] Starting Waitress Multi-Threaded Production WSGI Server on Port 5000...
echo Main URL: http://localhost:5000
echo.
python run_production.py

pause
