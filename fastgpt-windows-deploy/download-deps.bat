@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title FastGPT Windows 部署 - 依赖下载工具

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║      FastGPT Windows 部署 - 依赖下载工具        ║
echo  ║      在有网络的机器上下载所有依赖                 ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo 本脚本将从互联网下载所有必需的依赖包
echo 下载完成后，将整个 fastgpt-windows-deploy 目录复制到内网机器
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "INSTALLERS=%ROOT%\installers"
set "TEMP_DL=%ROOT%\temp_downloads"

:: 创建目录
if not exist "%INSTALLERS%" mkdir "%INSTALLERS%"
if not exist "%TEMP_DL%" mkdir "%TEMP_DL%"
if not exist "%INSTALLERS%\mongodb" mkdir "%INSTALLERS%\mongodb"
if not exist "%INSTALLERS%\pgsql" mkdir "%INSTALLERS%\pgsql"
if not exist "%INSTALLERS%\redis" mkdir "%INSTALLERS%\redis"
if not exist "%INSTALLERS%\pgvector" mkdir "%INSTALLERS%\pgvector"

:: 检查下载工具
set "DL_CMD="
where curl >nul 2>&1 && set "DL_CMD=curl -L -o"
where wget >nul 2>&1 && set "DL_CMD=wget -O"

if not defined DL_CMD (
    echo [ERROR] 未找到 curl 或 wget，请安装其中一个
    pause
    exit /b 1
)

:: =============================================================
:: 1. Node.js 20.14.0
:: =============================================================
echo.
echo [1/8] 下载 Node.js 20.14.0...
set "NODE_URL=https://nodejs.org/dist/v20.14.0/node-v20.14.0-x64.msi"
set "NODE_FILE=%INSTALLERS%\node-v20.14.0-x64.msi"

if exist "%NODE_FILE%" (
    echo   已存在，跳过
) else (
    echo   正在下载 Node.js (~30MB)...
    %DL_CMD% "%NODE_FILE%" "%NODE_URL%"
    if !errorlevel! neq 0 (
        echo   [FAILED] 下载失败，请手动下载:
        echo   %NODE_URL%
    ) else (
        echo   [OK] Node.js 下载完成
    )
)

:: =============================================================
:: 2. MongoDB 5.0 Community Server
:: =============================================================
echo.
echo [2/8] 下载 MongoDB 5.0 Windows ZIP...
set "MONGO_URL=https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-5.0.32.zip"
set "MONGO_FILE=%TEMP_DL%\mongodb-windows-x86_64-5.0.32.zip"

if exist "%INSTALLERS%\mongodb\bin\mongod.exe" (
    echo   已存在，跳过
) else (
    if not exist "%MONGO_FILE%" (
        echo   正在下载 MongoDB (~500MB)...
        %DL_CMD% "%MONGO_FILE%" "%MONGO_URL%"
    )

    if exist "%MONGO_FILE%" (
        echo   解压 MongoDB...
        powershell -Command "Expand-Archive -Path '%MONGO_FILE%' -DestinationPath '%TEMP_DL%\mongodb-extract' -Force"
        :: MongoDB ZIP 内部结构: mongodb-windows-x86_64-5.0.32/bin/...
        for /d %%d in ("%TEMP_DL%\mongodb-extract\*") do (
            xcopy /E /Y "%%d\*" "%INSTALLERS%\mongodb\" >nul
        )
        echo   [OK] MongoDB 解压完成
        echo   [INFO] MongoDB 5.0 使用 mongo.exe (legacy shell)，非 mongosh.exe
    ) else (
        echo   [FAILED] 下载失败
        echo   手动下载: https://www.mongodb.com/try/download/community
        echo   将 ZIP 解压后的内容放入: %INSTALLERS%\mongodb\
    )
)

:: =============================================================
:: 3. PostgreSQL 15 Windows
:: =============================================================
echo.
echo [3/8] 下载 PostgreSQL 15 Windows ZIP...
set "PG_URL=https://get.enterprisedb.com/postgresql/postgresql-15.15-1-windows-x64-binaries.zip"
set "PG_FILE=%TEMP_DL%\postgresql-15-windows-x64.zip"

if exist "%INSTALLERS%\pgsql\bin\psql.exe" (
    echo   已存在，跳过
) else (
    if not exist "%PG_FILE%" (
        echo   正在下载 PostgreSQL (~100MB)...
        %DL_CMD% "%PG_FILE%" "%PG_URL%"
    )

    if exist "%PG_FILE%" (
        echo   解压 PostgreSQL...
        powershell -Command "Expand-Archive -Path '%PG_FILE%' -DestinationPath '%TEMP_DL%\pgsql-extract' -Force"
        for /d %%d in ("%TEMP_DL%\pgsql-extract\pgsql") do (
            if exist "%%d" (
                xcopy /E /Y "%%d\*" "%INSTALLERS%\pgsql\" >nul
            )
        )
        :: 尝试直接复制 (不同版本结构可能不同)
        if not exist "%INSTALLERS%\pgsql\bin\psql.exe" (
            xcopy /E /Y "%TEMP_DL%\pgsql-extract\*" "%INSTALLERS%\pgsql\" >nul
        )
        echo   [OK] PostgreSQL 解压完成
    ) else (
        echo   [FAILED] 下载失败
        echo   手动下载: https://www.enterprisedb.com/download-postgresql-binaries
        echo   将 ZIP 解压后的内容放入: %INSTALLERS%\pgsql\
    )
)

:: =============================================================
:: 4. pgvector Windows DLL
:: =============================================================
echo.
echo [4/8] 下载 pgvector Windows 扩展...

if exist "%INSTALLERS%\pgvector\vector.dll" (
    echo   已存在，跳过
) else (
    echo   [INFO] pgvector Windows 编译版本需要从 GitHub Releases 获取
    echo   下载地址: https://github.com/pgvector/pgvector/releases
    echo.
    echo   请手动下载以下文件并放入 %INSTALLERS%\pgvector\:
    echo   1. vector.dll
    echo   2. vector.control
    echo   3. vector--0.8.0.sql
    echo.
    echo   或者从安装了 pgvector 的 PostgreSQL 中复制这些文件:
    echo   - PostgreSQL\lib\vector.dll
    echo   - PostgreSQL\share\extension\vector.control
    echo   - PostgreSQL\share\extension\vector--*.sql
    echo.
    choice /C YN /M "是否已手动放置 pgvector 文件"
    if errorlevel 2 (
        echo   跳过 pgvector 配置
    )
)

:: =============================================================
:: 5. Redis for Windows
:: =============================================================
echo.
echo [5/8] 下载 Redis Windows 版...

if exist "%INSTALLERS%\redis\redis-server.exe" (
    echo   已存在，跳过
) else (
    echo   [INFO] Redis 官方不支持 Windows，但有以下替代方案:
    echo   1. Memurai (推荐，免费开发版): https://www.memurai.com/get-memurai
    echo      Memurai 完全兼容 Redis，支持 Windows 服务安装
    echo.
    echo   2. Redis Windows 移植版 (GitHub):
    echo      https://github.com/tporadowski/redis/releases
    echo      (下载 redis-*.zip 解压到 installers\redis\)
    echo.
    echo   请选择一种方式下载 Redis Windows 版
    echo   Memurai 安装后将自动检测，无需放入 installers 目录
)

:: =============================================================
:: 6. MinIO Windows
:: =============================================================
echo.
echo [6/8] 下载 MinIO Windows 版...
set "MINIO_URL=https://dl.min.io/server/minio/release/windows-amd64/minio.exe"
set "MINIO_FILE=%INSTALLERS%\minio.exe"

if exist "%MINIO_FILE%" (
    :: Check if it's a real binary (not a Git LFS pointer)
    for %%f in ("%MINIO_FILE%") do (
        if %%~zf lss 1000 (
            echo   现有文件是 Git LFS 指针，重新下载...
            %DL_CMD% "%MINIO_FILE%" "%MINIO_URL%"
        ) else (
            echo   已存在，跳过
        )
    )
) else (
    echo   正在下载 MinIO (~100MB)...
    %DL_CMD% "%MINIO_FILE%" "%MINIO_URL%"
    if !errorlevel! neq 0 (
        echo   [FAILED] 下载失败
        echo   手动下载: %MINIO_URL%
        echo   放入: %INSTALLERS%\minio.exe
    ) else (
        echo   [OK] MinIO 下载完成
    )
)

:: =============================================================
:: 7. pnpm (全局安装)
:: =============================================================
echo.
echo [7/8] 检查 pnpm...
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo   pnpm 未安装
    echo   在内网机器上，先安装 Node.js 后运行: npm install -g pnpm
    echo.
    echo   或者在有网络的机器上下载 pnpm:
    echo   npm pack pnpm
    echo   将生成的 pnpm-*.tgz 复制到内网机器
    echo   运行: npm install -g pnpm-*.tgz
) else (
    for /f "tokens=*" %%i in ('pnpm -v') do echo   pnpm 版本: %%i
)

:: =============================================================
:: 8. FastGPT node_modules (离线打包)
:: =============================================================
echo.
echo [8/8] 检查 FastGPT node_modules...
if exist "%ROOT%\..\fastgpt-source" (
    if not exist "%ROOT%\..\fastgpt-source\node_modules\.pnpm" (
        echo   FastGPT 源码存在但 node_modules 未安装
        echo   建议运行 bundle-offline.bat 生成离线部署包
    ) else (
        echo   node_modules 已存在
    )
) else (
    echo   [INFO] fastgpt-source 目录不存在
    echo   请先克隆 FastGPT 源码: git clone https://github.com/labring/FastGPT.git fastgpt-source
)

:: =============================================================
:: 清理
:: =============================================================
echo.
echo 清理临时文件...
choice /C YN /T 10 /D Y /M "是否删除临时下载文件 (ZIP 包)"
if errorlevel 2 (
    echo   保留临时文件
) else (
    if exist "%TEMP_DL%" rmdir /S /Q "%TEMP_DL%"
    echo   已清理
)

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║              下载完成！                          ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║  请将整个 fastgpt-windows-deploy 目录             ║
echo  ║  复制到内网机器，然后运行:                        ║
echo  ║    setup.bat   - 安装环境                        ║
echo  ║    start.bat   - 启动服务                        ║
echo  ║    stop.bat    - 停止服务                        ║
echo  ╚══════════════════════════════════════════════════╝
echo.
pause