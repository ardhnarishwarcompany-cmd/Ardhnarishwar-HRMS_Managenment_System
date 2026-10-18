@echo off
title Ardhnarishwar Global Attendance Engine
echo =====================================================================
echo  Starting Ardhnarishwar Global SaaS Attendance Management Platform
echo =====================================================================
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" run_app.py
) else (
    python run_app.py
)
pause
