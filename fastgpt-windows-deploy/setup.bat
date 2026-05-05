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

:: 生成 MongoDB KeyFile (副本集认证用)
if not exist "%DATA_DIR%\mongodb.key" (
    echo   生成 MongoDB keyFile...
    openssl rand -base64 128 > "%DATA_DIR%\mongodb.key" 2>nul
    if !errorlevel! neq 0 (
        :: Fallback: use node to generate random bytes
        node -e "console.log(require('crypto').randomBytes(96).toString('base64'))" > "%DATA_DIR%\mongodb.key"
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

    if exist "%INSTALLERS_DIR%\pgvector\vector.dll" (
        echo   检测到 pgvector DLL，安装 PostgreSQL 后将自动配置 pgvector
    )
)

if %PG_INSTALLED% equ 1 (
    echo   检查 PostgreSQL share 目录完整性...
    set "PG_SHARE_OK=1"
    set "PG_SHARE_DIR=%INSTALLERS_DIR%\pgsql\share"
    for %%d in (extension timezone timezonesets tsearch_data) do (
        if not exist "!PG_SHARE_DIR!\%%d" (
            echo   [ERROR] PostgreSQL share\%%d 目录缺失！
            set "PG_SHARE_OK=0"
        )
    )
    if not exist "!PG_SHARE_DIR!\postgres.bki" (
        echo   [ERROR] postgres.bki 缺失！
        set "PG_SHARE_OK=0"
    )
    if !PG_SHARE_OK! equ 0 (
        echo   [ERROR] PostgreSQL 安装不完整，请重新解压 PostgreSQL ZIP
        echo   确保 pgsql\share\ 目录包含: extension, timezone, timezonesets, tsearch_data
        pause
        exit /b 1
    )
    echo   PostgreSQL share 目录完整

    echo   检查 pgvector 扩展...
    :: 检查 pgvector 是否已安装
    if exist "%INSTALLERS_DIR%\pgvector\vector.dll" (
        echo   配置 pgvector 扩展...
        set "PG_LIB_DIR=%INSTALLERS_DIR%\pgsql\lib"
        set "PG_EXT_DIR=%INSTALLERS_DIR%\pgsql\share\extension"
        :: 复制 DLL 到 PostgreSQL lib 目录
        if exist "!PG_LIB_DIR!\" (
            copy /Y "%INSTALLERS_DIR%\pgvector\vector.dll" "!PG_LIB_DIR!\" >nul 2>&1
            echo   pgvector DLL 已复制到 PostgreSQL lib 目录
        )
        :: 复制 .control 和 .sql 文件到 extension 目录
        if exist "%INSTALLERS_DIR%\pgvector\vector.control" (
            copy /Y "%INSTALLERS_DIR%\pgvector\vector.control" "!PG_EXT_DIR!\" >nul 2>&1
        )
        if exist "%INSTALLERS_DIR%\pgvector\*.sql" (
            copy /Y "%INSTALLERS_DIR%\pgvector\*.sql" "!PG_EXT_DIR!\" >nul 2>&1
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
        :: Check if minio.exe is a real binary (not a Git LFS pointer)
        for %%f in ("%INSTALLERS_DIR%\minio.exe") do (
            if %%~zf lss 1000 (
                echo   [ERROR] minio.exe 是 Git LFS 指针文件！
                echo   请先运行: git lfs pull
                echo   或手动下载: https://dl.min.io/server/minio/release/windows-amd64/minio.exe
            ) else (
                set "PATH=%INSTALLERS_DIR%;%PATH%"
                set "MINIO_INSTALLED=1"
                echo   使用便携版 MinIO
            )
        )
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
if exist "%FASTGPT_ROOT%\config\.env" (
    copy /Y "%FASTGPT_ROOT%\config\.env" "%SOURCE_DIR%\projects\app\.env" >nul
    echo   .env 已复制到 projects\app\
    echo.
    echo   [重要] 请确认 config\.env 中的 AI 模型配置正确:
    echo     OPENAI_BASE_URL  - 模型 API 端点
    echo     CHAT_API_KEY     - API 密钥（Ollama 用 ollama）
    echo     HELPER_BOT_MODEL - 模型名称（如 qwen2.5:7b）
) else (
    echo   [WARNING] config\.env 不存在！
    echo   请创建 config\.env 文件后再运行 setup.bat
)

cd /d "%SOURCE_DIR%"

:: 检查是否有离线 node_modules 分卷压缩包
set "ARCHIVE_EXTRACTED=0"
if exist "node_modules.tar.gz.partaa" (
    echo   检测到离线 node_modules 分卷压缩包，正在合并解压...
    echo   这可能需要几分钟时间...
    :: Windows cmd.exe 没有 cat 命令，使用 copy /b 合并分卷
    echo   合并分卷文件...
    copy /b node_modules.tar.gz.partaa+node_modules.tar.gz.partab+node_modules.tar.gz.partac+node_modules.tar.gz.partad node_modules.tar.gz >nul 2>&1
    if !errorlevel! neq 0 (
        :: 如果 copy /b 失败，尝试使用 PowerShell
        powershell -Command "Get-Content node_modules.tar.gz.part* -Raw | Set-Content node_modules.tar.gz -Encoding Byte" >nul 2>&1
    )
    echo   解压 node_modules...
    tar -xzf node_modules.tar.gz 2>&1
    if exist "node_modules.tar.gz" del node_modules.tar.gz
    if !errorlevel! equ 0 (
        set "ARCHIVE_EXTRACTED=1"
        echo   [OK] node_modules 解压完成
    ) else (
        echo   [WARNING] 解压失败，尝试 pnpm install 方式...
    )
)

if %ARCHIVE_EXTRACTED% equ 1 (
    :: 修复 pnpm 符号链接
    :: 内网环境下 pnpm install --frozen-lockfile 会因无法联网而失败
    :: 改用本地修复脚本，直接基于 .pnpm 虚拟存储重建所有符号链接
    echo   修复 pnpm 符号链接 (内网离线模式)...
    node "%FASTGPT_ROOT%\scripts\fix-pnpm-symlinks.js"
    if !errorlevel! neq 0 (
        echo   [WARNING] 符号链接修复失败
        echo   尝试 pnpm install --frozen-lockfile --ignore-scripts...
        pnpm install --frozen-lockfile --ignore-scripts 2>nul
        if !errorlevel! neq 0 (
            echo   [WARNING] pnpm 修复也失败了
            echo   请以管理员身份运行 setup.bat 以启用符号链接权限
        )
    )
) else (
    if exist "node_modules\.pnpm" (
        echo   node_modules 已存在，验证符号链接健康...
        node "%FASTGPT_ROOT%\scripts\fix-pnpm-symlinks.js"
        if !errorlevel! neq 0 (
            echo   [INFO] 符号链接存在部分问题，已尝试修复
        )
    ) else (
        echo   安装 npm 依赖 (首次可能需要较长时间)...
        echo   [INFO] 如在内网环境，请确保 node_modules.tar.gz 分卷压缩包存在
        pnpm install --ignore-scripts 2>&1
        if !errorlevel! neq 0 (
            echo   [WARNING] pnpm install 失败 - 内网环境可能无法下载
            echo   请在有网环境运行 pnpm install 后，用 bundle-offline.bat 打包
        )
    )
)

:: 检查 SDK 是否已预构建 (dist 目录已提交到 git)
set "SDK_BUILT=1"
for %%s in (storage logger otel) do (
    if not exist "%SOURCE_DIR%\sdk\%%s\dist\index.js" (
        if not exist "%SOURCE_DIR%\sdk\%%s\dist\index.mjs" (
            set "SDK_BUILT=0"
        )
    )
)

:: 构建 SDK 包 (仅在未预构建时)
if %SDK_BUILT% equ 0 (
    echo   构建 SDK 包...
    pnpm build:sdks 2>&1
    if !errorlevel! neq 0 (
        echo   [WARNING] SDK 构建失败 (rolldown Windows 兼容性问题)
        echo   尝试使用 --ignore-scripts 重新安装...
        pnpm install --ignore-scripts 2>nul
        pnpm build:sdks 2>&1
        if !errorlevel! neq 0 (
            echo   [ERROR] SDK 构建仍然失败，FastGPT 可能无法正常启动
            echo   请确保 sdk/*/dist/ 目录已包含预构建文件
        )
    )
) else (
    echo   SDK 包已预构建，跳过构建步骤
)

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
echo   [内网 AI 模型配置]
echo   启动后，需要在后台管理页面或 config\.env 中配置 AI 模型:
echo     - 推荐 Ollama: OPENAI_BASE_URL=http://localhost:11434/v1
echo     - 或 vLLM:    OPENAI_BASE_URL=http://内网IP:端口/v1
echo.
pause