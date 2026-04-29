@echo off
chcp 65001 >nul
title FastGPT - 停止所有服务

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        FastGPT Windows 本地部署 - 停止服务       ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set "FASTGPT_ROOT=%~dp0"
set "FASTGPT_ROOT=%FASTGPT_ROOT:~0,-1%"
set "DATA_DIR=%FASTGPT_ROOT%\data"

echo 正在停止所有 FastGPT 相关服务...

:: 停止 FastGPT (Node.js)
echo   停止 FastGPT 应用...
taskkill /F /FI "WINDOWTITLE eq FastGPT*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

:: 停止 MinIO
echo   停止 MinIO...
taskkill /F /FI "WINDOWTITLE eq FastGPT-MinIO*" >nul 2>&1
taskkill /F /IM minio.exe >nul 2>&1

:: 停止 Redis
echo   停止 Redis...
taskkill /F /FI "WINDOWTITLE eq FastGPT-Redis*" >nul 2>&1
taskkill /F /IM redis-server.exe >nul 2>&1

:: 停止 PostgreSQL
echo   停止 PostgreSQL...
set "PG_CTL_PATH="
where pg_ctl >nul 2>&1 && for /f "delims=" %%i in ('where pg_ctl') do set "PG_CTL_PATH=%%i"

if not defined PG_CTL_PATH (
    if exist "%FASTGPT_ROOT%\installers\pgsql\bin\pg_ctl.exe" (
        set "PG_CTL_PATH=%FASTGPT_ROOT%\installers\pgsql\bin\pg_ctl.exe"
    )
)

if defined PG_CTL_PATH (
    "%PG_CTL_PATH%" stop -D "%DATA_DIR%\pg" -m fast >nul 2>&1
    if %errorlevel% equ 0 (
        echo   PostgreSQL 已停止
    )
) else (
    taskkill /F /IM postgres.exe >nul 2>&1
)

:: 停止 MongoDB
echo   停止 MongoDB...
taskkill /F /FI "WINDOWTITLE eq FastGPT-MongoDB*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq MongoDB-Init*" >nul 2>&1
taskkill /F /IM mongod.exe >nul 2>&1

echo.
echo 所有服务已停止！
echo.
pause
