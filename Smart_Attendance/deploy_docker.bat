@echo off
title Ardhnarishwar Global Attendance Platform - Docker Production Deployer
color 0B
echo ======================================================================
echo   ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM - DOCKER DEPLOYER
echo ======================================================================
echo.

docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not running!
    echo Please install Docker Desktop and make sure the Docker engine is running.
    pause
    exit /b 1
)

echo [1/3] Building production containers with Docker Compose...
docker compose up --build -d

if errorlevel 1 (
    echo [ERROR] Docker compose build or start failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Checking running containers...
docker compose ps

echo.
echo [3/3] Deployment complete!
echo ======================================================================
echo   Web Application : http://localhost:5000
echo   Health Check    : http://localhost:5000/health
echo   Portal Login    : http://localhost:5000/login
echo ======================================================================
echo.
echo Launching default web browser...
start http://localhost:5000

pause
