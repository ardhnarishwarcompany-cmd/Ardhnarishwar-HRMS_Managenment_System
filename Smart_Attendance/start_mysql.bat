@echo off
title Ardhnarishwar - MySQL Server Service Starter
echo ======================================================================
echo   ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM - MYSQL SERVICE STARTER
echo ======================================================================
echo.
echo Attempting to start Windows MySQL service (MySQL80)...
echo.

powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command \"Start-Service -Name MySQL80; Write-Host \\`\"[✓] MySQL80 service start requested.\\`\"; Start-Sleep -Seconds 3\"' -Wait"

echo.
echo Checking MySQL80 Service Status:
powershell -Command "Get-Service -Name MySQL80 -ErrorAction SilentlyContinue | Select-Object Status, Name, DisplayName | Format-Table -AutoSize"
echo.

echo Testing MySQL Connection & Initializing Database:
python backend/setup_mysql.py

echo.
echo ======================================================================
echo Press any key to exit this window...
pause >nul
