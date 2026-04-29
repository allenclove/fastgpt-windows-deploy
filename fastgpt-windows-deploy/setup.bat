@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title FastGPT Windows 一键部署工具 - 环境安装

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║       FastGPT Windows 本地部署 - 环境安装        ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set "FASTGPT_ROOT=%~dp0"
set "FASTGPT_ROOT=%FASTGPT_ROOT:~0,-1%"
set "INSTALLERS_DIR=%FASTGPT_ROOT%\installers"
set "DATA_DIR=%FASTGPT_ROOT%\data"
set "LOG_DIR=%FASTGPT_ROOT%\logs"
set "SOURCE_DIR=%FASTGPT_ROOT%\..\fastgpt-source"

:: ============ 检查基础条件 ============
echo [1/7] 检查运行环境...

:: 创建必要目录
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%DATA_DIR%\mongodb" mkdir "%DATA_DIR%\mongodb"
if not exist "%DATA_DIR%\pg" mkdir "%DATA_DIR%\pg"
if not exist "%DATA_DIR%\redis" mkdir "%DATA_DIR%\redis"
if not exist "%DATA_DIR%\minio" mkdir "%DATA_DIR%\minio"
if not exist "%DATA_DIR%\logs" mkdir "%DATA_DIR%\logs"

:: 检查 Node.js
echo 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Node.js 未安装！
    echo.
    echo 请先安装 Node.js 20.x (推荐 20.14.0):
    echo   在线安装: https://nodejs.org/dist/v20.14.0/node-v20.14.0-x64.msi
    echo   或者运行 download-deps.bat 自动下载
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo   Node.js 版本: %%i

:: 检查 pnpm
echo 检查 pnpm...
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] pnpm 未安装，正在安装...
    npm install -g pnpm@10.33.2
    if !errorlevel! neq 0 (
        echo [ERROR] pnpm 安装失败，请手动安装: npm install -g pnpm
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('pnpm -v') do echo   pnpm 版本: %%i

echo [OK] 基础环境检查完成
echo.

:: ============ MongoDB ============
echo [2/7] 配置 MongoDB...

set "MONGO_INSTALLED=0"
where mongod >nul 2>&1 && set "MONGO_INSTALLED=1"

if %MONGO_INSTALLED% equ 0 (
    :: 检查是否在 installers 目录
    if exist "%INSTALLERS_DIR%\mongodb\bin\mongod.exe" (
        set "PATH=%INSTALLERS_DIR%\mongodb\bin;%PATH%"
        set "MONGO_INSTALLED=1"
        echo   使用便携版 MongoDB
    )
)

if %MONGO_INSTALLED% equ 0 (
    echo [WARNING] MongoDB 未找到！
    echo   在线安装: https://www.mongodb.com/try/download/community
    echo   或者下载 MongoDB 5.0 Windows ZIP 版放入 installers\mongodb\
    echo.
)

:: 初始化 MongoDB 副本集
if %MONGO_INSTALLED% equ 1 (
    echo   初始化 MongoDB 配置...

    :: 确保数据目录存在
    if not exist "%DATA_DIR%\mongodb" mkdir "%DATA_DIR%\mongodb"
    if not exist "%DATA_DIR%\logs" mkdir "%DATA_DIR%\logs"

    :: 生成 MongoDB KeyFile (副本集认证用)
    if not exist "%DATA_DIR%\mongodb.key" (
        powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(128))" > "%DATA_DIR%\mongodb.key"
    )
)

echo [OK] MongoDB 配置完成
echo.

:: ============ PostgreSQL ============
echo [3/7] 配置 PostgreSQL...

set "PG_INSTALLED=0"
where psql >nul 2>&1 && set "PG_INSTALLED=1"

if %PG_INSTALLED% equ 0 (
    if exist "%INSTALLERS_DIR%\pgsql\bin\psql.exe" (
        set "PATH=%INSTALLERS_DIR%\pgsql\bin;%PATH%"
        set "PG_INSTALLED=1"
        echo   使用便携版 PostgreSQL
    )
)

if %PG_INSTALLED% equ 0 (
    echo [WARNING] PostgreSQL 未找到！
    echo   在线安装: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
    echo   或者下载 PostgreSQL 15 Windows ZIP 版放入 installers\pgsql\
    echo.

    :: 检查是否有 pgvector DLL 需要安装
    if exist "%INSTALLERS_DIR%\pgvector\vector.dll" (
        echo   检测到 pgvector DLL，安装 PostgreSQL 后将自动配置 pgvector
    )
)

if %PG_INSTALLED% equ 1 (
    echo   检查 pgvector 扩展...
    :: 检查 pgvector 是否已安装
    if exist "%INSTALLERS_DIR%\pgvector\vector.dll" (
        echo   配置 pgvector 扩展...
        :: 复制 DLL 到 PostgreSQL lib 目录
        for /f "delims=" %%i in ('where psql') do (
            set "PSQL_PATH=%%~dpi"
            set "PSQL_PATH=!PSQL_PATH:~0,-5!"
        )
        if exist "!PSQL_PATH!lib\" (
            copy /Y "%INSTALLERS_DIR%\pgvector\vector.dll" "!PSQL_PATH!lib\" >nul 2>&1
            echo   pgvector DLL 已复制到 PostgreSQL lib 目录
        )
        :: 也复制 .control 和 .sql 文件
        if exist "%INSTALLERS_DIR%\pgvector\vector.control" (
            copy /Y "%INSTALLERS_DIR%\pgvector\vector.control" "!PSQL_PATH!share\extension\" >nul 2>&1
        )
        if exist "%INSTALLERS_DIR%\pgvector\*.sql" (
            copy /Y "%INSTALLERS_DIR%\pgvector\*.sql" "!PSQL_PATH!share\extension\" >nul 2>&1
        )
    ) else (
        echo   [WARNING] pgvector 扩展未找到，请在 installers\pgvector\ 放置 pgvector 文件
        echo   pgvector 下载: https://github.com/pgvector/pgvector/releases
    )
)

echo [OK] PostgreSQL 配置完成
echo.

:: ============ Redis ============
echo [4/7] 配置 Redis...

set "REDIS_INSTALLED=0"
where redis-server >nul 2>&1 && set "REDIS_INSTALLED=1"

if %REDIS_INSTALLED% equ 0 (
    if exist "%INSTALLERS_DIR%\redis\redis-server.exe" (
        set "PATH=%INSTALLERS_DIR%\redis;%PATH%"
        set "REDIS_INSTALLED=1"
        echo   使用便携版 Redis
    )
)

if %REDIS_INSTALLED% equ 0 (
    :: 尝试安装 Memurai (Redis Windows 替代)
    if exist "%INSTALLERS_DIR%\Memurai-Installer.exe" (
        echo   正在安装 Memurai (Redis Windows 兼容版)...
        "%INSTALLERS_DIR%\Memurai-Installer.exe" /S
        if !errorlevel! equ 0 (
            set "REDIS_INSTALLED=1"
            echo   Memurai 安装完成
        )
    )
)

if %REDIS_INSTALLED% equ 0 (
    echo [WARNING] Redis 未找到！
    echo   替代方案:
    echo   1. Memurai Dev (免费): https://www.memurai.com/get-memurai
    echo   2. 下载 Redis Windows 移植版放入 installers\redis\
    echo.
    echo   注意: Redis 用于会话缓存和流式响应恢复，如仅测试可暂时跳过
)

echo [OK] Redis 配置完成
echo.

:: ============ MinIO ============
echo [5/7] 配置 MinIO (对象存储)...

set "MINIO_INSTALLED=0"
where minio >nul 2>&1 && set "MINIO_INSTALLED=1"

if %MINIO_INSTALLED% equ 0 (
    if exist "%INSTALLERS_DIR%\minio.exe" (
        set "PATH=%INSTALLERS_DIR%;%PATH%"
        set "MINIO_INSTALLED=1"
        echo   使用便携版 MinIO
    )
)

if %MINIO_INSTALLED% equ 0 (
    echo [WARNING] MinIO 未找到！
    echo   下载 MinIO Windows 版: https://dl.min.io/server/minio/release/windows-amd64/minio.exe
    echo   将 minio.exe 放入 installers\ 目录
    echo.
    echo   注意: MinIO 用于文件存储，如仅测试可暂时跳过
)

echo [OK] MinIO 配置完成
echo.

:: ============ FastGPT 依赖安装 ============
echo [6/7] 安装 FastGPT 项目依赖...

if not exist "%SOURCE_DIR%" (
    echo [ERROR] FastGPT 源码未找到: %SOURCE_DIR%
    echo   请确保 fastgpt-source 目录与部署工具在同一父目录
    pause
    exit /b 1
)

:: 复制 .env 配置文件
echo   配置环境变量...
copy /Y "%FASTGPT_ROOT%\config\.env" "%SOURCE_DIR%\projects\app\.env" >nul

cd /d "%SOURCE_DIR%"

:: 检查是否有离线 node_modules 分卷压缩包
set "ARCHIVE_EXTRACTED=0"
if exist "node_modules.tar.gz.partaa" (
    echo   检测到离线 node_modules 分卷压缩包，正在合并解压...
    echo   这可能需要几分钟时间...
    cat node_modules.tar.gz.part* | tar -xzf - 2>&1
    if !errorlevel! equ 0 (
        set "ARCHIVE_EXTRACTED=1"
        echo   [OK] node_modules 解压完成
    ) else (
        echo   [WARNING] 解压失败，尝试 pnpm install 方式...
    )
)

if %ARCHIVE_EXTRACTED% equ 0 (
    if exist "node_modules\.pnpm" (
        echo   node_modules 已存在，跳过安装
    ) else (
        echo   安装 npm 依赖 (首次可能需要较长时间)...
        pnpm install --prefer-offline 2>&1 | findstr /V "Progress:"
        if !errorlevel! neq 0 (
            echo   [WARNING] pnpm install 可能未完全成功，尝试继续...
        )
    )
)

:: 构建 SDK 包
echo   构建 SDK 包...
pnpm build:sdks 2>&1

echo [OK] FastGPT 依赖安装完成
echo.

:: ============ 总结 ============
echo [7/7] 安装完成！
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║              环境安装完成！                      ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║  请确认以下服务是否就绪:                         ║
echo  ╚══════════════════════════════════════════════════╝
echo.
if %MONGO_INSTALLED% equ 1 (
    echo   [OK] MongoDB - 就绪
) else (
    echo   [!!] MongoDB - 未安装
)
if %PG_INSTALLED% equ 1 (
    echo   [OK] PostgreSQL - 就绪
) else (
    echo   [!!] PostgreSQL - 未安装
)
if %REDIS_INSTALLED% equ 1 (
    echo   [OK] Redis - 就绪
) else (
    echo   [!!] Redis - 未安装 (可使用 Memurai 替代)
)
if %MINIO_INSTALLED% equ 1 (
    echo   [OK] MinIO - 就绪
) else (
    echo   [!!] MinIO - 未安装
)
echo.
echo   下一步: 运行 start.bat 启动所有服务
echo.
pause
