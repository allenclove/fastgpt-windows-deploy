@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title FastGPT - 服务运行中 (不要关闭此窗口)

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        FastGPT Windows 本地部署 - 启动服务       ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set "FASTGPT_ROOT=%~dp0"
set "FASTGPT_ROOT=%FASTGPT_ROOT:~0,-1%"
set "INSTALLERS_DIR=%FASTGPT_ROOT%\installers"
set "DATA_DIR=%FASTGPT_ROOT%\data"
set "LOG_DIR=%FASTGPT_ROOT%\logs"
set "SOURCE_DIR=%FASTGPT_ROOT%\..\fastgpt-source"
set "CONFIG_DIR=%FASTGPT_ROOT%\config"

:: 管理员权限检查 (MongoDB 需要)
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] 建议以管理员身份运行此脚本!
    echo   部分服务 (MongoDB) 可能需要管理员权限
    echo.
)

:: 创建必要目录
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%DATA_DIR%\mongodb" mkdir "%DATA_DIR%\mongodb"
if not exist "%DATA_DIR%\pg" mkdir "%DATA_DIR%\pg"
if not exist "%DATA_DIR%\redis" mkdir "%DATA_DIR%\redis"
if not exist "%DATA_DIR%\minio" mkdir "%DATA_DIR%\minio"

:: 记录所有启动的进程 PID，用于后续关闭
set "PIDS="

:: =============================================================
:: 1. 启动 MongoDB
:: =============================================================
echo [1/6] 启动 MongoDB...

:: 检查 MongoDB 是否已在运行
curl -s http://127.0.0.1:27017 >nul 2>&1
if %errorlevel% equ 0 (
    echo   MongoDB 已在运行中
    goto :mongo_done
)

set "MONGOD_PATH="
where mongod >nul 2>&1 && for /f "delims=" %%i in ('where mongod') do set "MONGOD_PATH=%%i"
if not defined MONGOD_PATH (
    if exist "%INSTALLERS_DIR%\mongodb\bin\mongod.exe" (
        set "MONGOD_PATH=%INSTALLERS_DIR%\mongodb\bin\mongod.exe"
    )
)

if not defined MONGOD_PATH (
    echo   [WARNING] mongod.exe 未找到，跳过 MongoDB
    goto :mongo_done
)

:: 检查是否是首次运行 (需要初始化副本集)
set "NEED_INIT_MONGO=0"
if not exist "%DATA_DIR%\mongodb\.initialized" set "NEED_INIT_MONGO=1"

:: 先尝试无认证启动以初始化
if %NEED_INIT_MONGO% equ 1 (
    echo   首次运行，正在初始化 MongoDB 副本集...

    :: 启动 MongoDB (无认证模式)
    start "MongoDB-Init" /MIN "%MONGOD_PATH%" --dbpath "%DATA_DIR%\mongodb" --logpath "%LOG_DIR%\mongodb-init.log" --replSet rs0 --port 27017 --bind_ip 127.0.0.1
    set "MONGO_PID=!ERRORLEVEL!"

    :: 等待 MongoDB 启动
    echo   等待 MongoDB 启动...
    timeout /t 5 >nul

    :: 初始化副本集
    "%MONGOD_PATH:~0,-10%mongosh.exe" --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})" 127.0.0.1:27017/admin >nul 2>&1
    if errorlevel 1 (
        echo   [INFO] 副本集可能已初始化
    )

    :: 等待副本集生效
    timeout /t 3 >nul

    :: 创建管理员用户
    echo   创建数据库用户...
    "%MONGOD_PATH:~0,-10%mongosh.exe" --quiet --eval "db.getSiblingDB('admin').createUser({user:'fastgpt',pwd:'fastgpt123',roles:['root']})" 127.0.0.1:27017/admin >nul 2>&1
    if errorlevel 1 (
        echo   [INFO] 用户可能已存在
    )

    :: 停止无认证的 MongoDB
    taskkill /F /IM mongod.exe >nul 2>&1
    timeout /t 3 >nul

    :: 标记已初始化
    echo initialized > "%DATA_DIR%\mongodb\.initialized"
    echo   MongoDB 初始化完成
)

:: 启动 MongoDB (认证模式)
echo   启动 MongoDB 服务...
start "FastGPT-MongoDB" /MIN "%MONGOD_PATH%" --config "%CONFIG_DIR%\mongod.cfg" --logpath "%LOG_DIR%\mongodb.log" --dbpath "%DATA_DIR%\mongodb"
set "MONGO_PID=%ERRORLEVEL%"
set "PIDS=%PIDS% mongod"

:: 等待 MongoDB 就绪
echo   等待 MongoDB 就绪...
set "MONGO_READY=0"
for /L %%i in (1,1,30) do (
    "%MONGOD_PATH:~0,-10%mongosh.exe" --quiet -u fastgpt -p fastgpt123 --authenticationDatabase admin --eval "db.adminCommand('ping')" 127.0.0.1:27017/admin >nul 2>&1
    if !errorlevel! equ 0 (
        set "MONGO_READY=1"
        goto :mongo_ready
    )
    timeout /t 1 >nul
)
:mongo_ready
if %MONGO_READY% equ 0 (
    echo   [WARNING] MongoDB 可能未完全就绪，继续...
) else (
    echo   MongoDB 就绪 (127.0.0.1:27017)
)

:mongo_done
echo.

:: =============================================================
:: 2. 启动 PostgreSQL
:: =============================================================
echo [2/6] 启动 PostgreSQL...

:: 检查 PostgreSQL 是否已在运行
curl -s http://127.0.0.1:5432 >nul 2>&1
set "PG_RUNNING=0"

set "PG_CTL_PATH="
where pg_ctl >nul 2>&1 && for /f "delims=" %%i in ('where pg_ctl') do set "PG_CTL_PATH=%%i"

if not defined PG_CTL_PATH (
    if exist "%INSTALLERS_DIR%\pgsql\bin\pg_ctl.exe" (
        set "PG_CTL_PATH=%INSTALLERS_DIR%\pgsql\bin\pg_ctl.exe"
        set "PATH=%INSTALLERS_DIR%\pgsql\bin;%PATH%"
    )
)

if not defined PG_CTL_PATH (
    echo   [WARNING] pg_ctl.exe 未找到，跳过 PostgreSQL
    goto :pg_done
)

:: 检查数据目录是否已初始化
if not exist "%DATA_DIR%\pg\PG_VERSION" (
    echo   首次运行，初始化 PostgreSQL 数据目录...
    "%PG_CTL_PATH:~0,-10%initdb.exe" -D "%DATA_DIR%\pg" -U fastgpt --auth-host=scram-sha-256 --auth-local=scram-sha-256 -E UTF8 >nul 2>&1
    if !errorlevel! neq 0 (
        echo   [WARNING] PostgreSQL 初始化失败
        goto :pg_done
    )
    echo   PostgreSQL 数据目录初始化完成
)

:: 启动 PostgreSQL
echo   启动 PostgreSQL...
start "FastGPT-PostgreSQL" /MIN "%PG_CTL_PATH%" start -D "%DATA_DIR%\pg" -l "%LOG_DIR%\postgresql.log"
set "PIDS=%PIDS% postgres"

:: 等待 PostgreSQL 就绪
echo   等待 PostgreSQL 就绪...
set "PG_READY=0"
for /L %%i in (1,1,30) do (
    "%PG_CTL_PATH:~0,-10%psql.exe" -U fastgpt -d postgres -h 127.0.0.1 -p 5432 -c "SELECT 1" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PG_READY=1"
        goto :pg_ready
    )
    :: 如果认证失败，尝试先创建用户
    "%PG_CTL_PATH:~0,-10%psql.exe" -U postgres -d postgres -h 127.0.0.1 -p 5432 -c "SELECT 1" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   创建 fastgpt 用户...
        "%PG_CTL_PATH:~0,-10%psql.exe" -U postgres -d postgres -h 127.0.0.1 -p 5432 -c "CREATE ROLE fastgpt WITH LOGIN PASSWORD 'fastgpt123' SUPERUSER;" >nul 2>&1
        set "PG_READY=1"
        goto :pg_ready
    )
    timeout /t 1 >nul
)
:pg_ready
if %PG_READY% equ 0 (
    echo   [WARNING] PostgreSQL 可能未完全就绪，继续...
) else (
    :: 创建 pgvector 扩展
    "%PG_CTL_PATH:~0,-10%psql.exe" -U fastgpt -d postgres -h 127.0.0.1 -p 5432 -c "CREATE EXTENSION IF NOT EXISTS vector;" >nul 2>&1
    echo   PostgreSQL 就绪 (127.0.0.1:5432)
)

:pg_done
echo.

:: =============================================================
:: 3. 启动 Redis
:: =============================================================
echo [3/6] 启动 Redis...

curl -s http://127.0.0.1:6379 >nul 2>&1
if %errorlevel% equ 0 (
    echo   Redis 已在运行中
    goto :redis_done
)

set "REDIS_PATH="
where redis-server >nul 2>&1 && for /f "delims=" %%i in ('where redis-server') do set "REDIS_PATH=%%i"

if not defined REDIS_PATH (
    if exist "%INSTALLERS_DIR%\redis\redis-server.exe" (
        set "REDIS_PATH=%INSTALLERS_DIR%\redis\redis-server.exe"
    )
)

:: 检查 Memurai
if not defined REDIS_PATH (
    if exist "C:\Program Files\Memurai\memurai.exe" (
        set "REDIS_PATH=C:\Program Files\Memurai\memurai.exe"
    )
)

if not defined REDIS_PATH (
    echo   [WARNING] redis-server 未找到，跳过 Redis
    echo   可安装 Memurai (免费): https://www.memurai.com/get-memurai
    goto :redis_done
)

start "FastGPT-Redis" /MIN "%REDIS_PATH%" "%CONFIG_DIR%\redis.conf" --dir "%DATA_DIR%\redis" --logfile "%LOG_DIR%\redis.log"
set "PIDS=%PIDS% redis"

:: 等待 Redis 就绪
timeout /t 3 >nul
echo   Redis 已启动 (127.0.0.1:6379)

:redis_done
echo.

:: =============================================================
:: 4. 启动 MinIO
:: =============================================================
echo [4/6] 启动 MinIO (对象存储)...

set "MINIO_PATH="
where minio >nul 2>&1 && for /f "delims=" %%i in ('where minio') do set "MINIO_PATH=%%i"

if not defined MINIO_PATH (
    if exist "%INSTALLERS_DIR%\minio.exe" (
        set "MINIO_PATH=%INSTALLERS_DIR%\minio.exe"
    )
)

if not defined MINIO_PATH (
    echo   [WARNING] minio.exe 未找到，跳过 MinIO
    echo   下载: https://dl.min.io/server/minio/release/windows-amd64/minio.exe
    goto :minio_done
)

:: 设置 MinIO 凭据
set "MINIO_ROOT_USER=minioadmin"
set "MINIO_ROOT_PASSWORD=minioadmin"

start "FastGPT-MinIO" /MIN "%MINIO_PATH%" server "%DATA_DIR%\minio" --address "127.0.0.1:9000" --console-address "127.0.0.1:9001"
set "PIDS=%PIDS% minio"

timeout /t 3 >nul
echo   MinIO 已启动 (API: 127.0.0.1:9000, Console: 127.0.0.1:9001)

:minio_done
echo.

:: =============================================================
:: 5. 数据库初始化 (首次运行)
:: =============================================================
echo [5/6] 检查数据库初始化状态...

if not exist "%DATA_DIR%\.db_initialized" (
    echo   首次运行，执行数据库初始化...

    :: 创建 MinIO buckets (如果 MinIO 已启动)
    curl -s http://127.0.0.1:9000 >nul 2>&1
    if !errorlevel! equ 0 (
        echo   创建 MinIO 存储桶...
        curl -s -X PUT "http://127.0.0.1:9000/fastgpt-public" >nul 2>&1
        curl -s -X PUT "http://127.0.0.1:9000/fastgpt-private" >nul 2>&1
    )

    echo   initialized > "%DATA_DIR%\.db_initialized"
    echo   数据库初始化完成
) else (
    echo   数据库已初始化，跳过
)
echo.

:: =============================================================
:: 6. 启动 FastGPT
:: =============================================================
echo [6/6] 启动 FastGPT 应用...

if not exist "%SOURCE_DIR%" (
    echo   [ERROR] FastGPT 源码未找到: %SOURCE_DIR%
    pause
    goto :end
)

:: 确保 .env 文件存在
if not exist "%SOURCE_DIR%\projects\app\.env" (
    copy /Y "%CONFIG_DIR%\.env" "%SOURCE_DIR%\projects\app\.env" >nul
)

cd /d "%SOURCE_DIR%\projects\app"

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║         所有基础服务已启动！                     ║
echo  ║         正在启动 FastGPT 应用...                  ║
echo  ║         访问: http://localhost:3000               ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  [默认账号]
echo    用户名: root
echo    密码:   123456
echo.
echo  按 Ctrl+C 停止 FastGPT，然后运行 stop.bat 停止所有服务
echo  ═══════════════════════════════════════════════════
echo.

:: 启动 FastGPT 开发服务器
pnpm dev

:end
endlocal
