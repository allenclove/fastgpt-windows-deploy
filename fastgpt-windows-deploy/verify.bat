@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title FastGPT - 预检查工具

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        FastGPT 部署预检查 - 启动前运行           ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set "PASS=0"
set "FAIL=0"
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:: =============================================================
:: 1. 检查端口是否被 Windows 保留
:: =============================================================
echo [1] 检查 Windows 端口保留范围...

for %%p in (3000 4000 4004 27017 5432 6379 9000) do (
    netsh interface ipv4 show excludedportrange protocol=tcp 2>&1 | findstr "%%p" >nul
    if !errorlevel! equ 0 (
        echo   [WARN] 端口 %%p 在 Windows 保留范围内
        set /a FAIL+=1
    )
)

echo.
echo [2] 检查依赖文件完整性...

:: =============================================================
:: 2. Check essential system tools
:: =============================================================
where tar >nul 2>&1
if !errorlevel! neq 0 (
    echo   [FAIL] tar 命令不可用 - node_modules 解压需要
    echo         请升级到 Windows 10 版本 1803 或更高
    set /a FAIL+=1
) else (
    echo   [OK] tar 命令可用
    set /a PASS+=1
)

where powershell >nul 2>&1
if !errorlevel! neq 0 (
    echo   [FAIL] PowerShell 不可用
    set /a FAIL+=1
) else (
    echo   [OK] PowerShell 可用
    set /a PASS+=1
)

:: =============================================================
:: 3. Check Node.js
:: =============================================================
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo   [FAIL] Node.js 未安装
    set /a FAIL+=1
) else (
    for /f "tokens=*" %%i in ('node -v') do echo   [OK] Node.js %%i
    set /a PASS+=1
)

:: =============================================================
:: 3. Check pnpm
:: =============================================================
where pnpm >nul 2>&1
if !errorlevel! neq 0 (
    echo   [FAIL] pnpm 未安装
    set /a FAIL+=1
) else (
    for /f "tokens=*" %%i in ('pnpm -v') do echo   [OK] pnpm %%i
    set /a PASS+=1
)

:: =============================================================
:: 4. Check PostgreSQL share directory
:: =============================================================
set "PG_SHARE=%ROOT%\installers\pgsql\share"
if exist "%PG_SHARE%\postgres.bki" (
    echo   [OK] PostgreSQL share 目录完整
    set /a PASS+=1
) else (
    echo   [FAIL] PostgreSQL share 目录不完整 - 缺 postgres.bki
    echo         请重新解压 PostgreSQL ZIP: installers\pgsql\
    set /a FAIL+=1
)

:: Check all required subdirs
for %%d in (extension timezone timezonesets tsearch_data contribution) do (
    if not exist "%PG_SHARE%\%%d" (
        echo   [WARN] PostgreSQL share\%%d 目录缺失
    )
)

:: =============================================================
:: 5. Check MongoDB binary
:: =============================================================
if exist "%ROOT%\installers\mongodb\bin\mongod.exe" (
    echo   [OK] MongoDB portable 就绪
    set /a PASS+=1
) else (
    where mongod >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] MongoDB 已安装 (系统级)
        set /a PASS+=1
    ) else (
        echo   [FAIL] MongoDB 未找到
        set /a FAIL+=1
    )
)

:: Check mongo shell (mongosh or legacy mongo)
if exist "%ROOT%\installers\mongodb\bin\mongosh.exe" (
    echo   [OK] mongosh 就绪
) else (
    if exist "%ROOT%\installers\mongodb\bin\mongo.exe" (
        echo   [OK] mongo (legacy shell) 就绪
    ) else (
        echo   [WARN] MongoDB shell 未找到 - 副本集初始化可能失败
    )
)

:: =============================================================
:: 6. Check Redis
:: =============================================================
if exist "%ROOT%\installers\redis\redis-server.exe" (
    echo   [OK] Redis portable 就绪
    set /a PASS+=1
) else (
    where redis-server >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] Redis 已安装 (系统级)
        set /a PASS+=1
    ) else (
        echo   [WARN] Redis 未找到 - 可安装 Memurai (免费)
        set /a FAIL+=1
    )
)

:: =============================================================
:: 7. Check MinIO
:: =============================================================
if exist "%ROOT%\installers\minio.exe" (
    :: Check if minio.exe is a real binary (not a Git LFS pointer)
    for %%f in ("%ROOT%\installers\minio.exe") do (
        if %%~zf lss 1000 (
            echo   [INFO] minio.exe 是 Git LFS 指针，将从分卷自动组装
        ) else (
            echo   [OK] MinIO portable 就绪
            set /a PASS+=1
        )
    )
) else (
    :: minio.exe 不存在，检查分卷
    if exist "%ROOT%\installers\minio.exe.partaa" (
        echo   [INFO] minio.exe 不存在，但分卷文件就绪，setup.bat 将自动组装
    ) else (
        where minio >nul 2>&1
        if !errorlevel! equ 0 (
            echo   [OK] MinIO 已安装 (系统级)
            set /a PASS+=1
        ) else (
            echo   [WARN] MinIO 未找到
            set /a FAIL+=1
        )
    )
)

:: Check MinIO part files
if exist "%ROOT%\installers\minio.exe.partaa" (
    echo   [OK] MinIO 分卷 partaa 就绪
    set /a PASS+=1
)
if exist "%ROOT%\installers\minio.exe.partab" (
    echo   [OK] MinIO 分卷 partab 就绪
    set /a PASS+=1
)
if exist "%ROOT%\installers\minio.exe.partac" (
    echo   [OK] MinIO 分卷 partac 就绪
    set /a PASS+=1
)

:: =============================================================
:: 8. Check pgvector
:: =============================================================
if exist "%ROOT%\installers\pgvector\vector.dll" (
    echo   [OK] pgvector DLL 就绪
    set /a PASS+=1
) else (
    echo   [WARN] pgvector DLL 未找到 - 向量搜索功能不可用
    set /a FAIL+=1
)

:: =============================================================
:: 9. Check FastGPT source
:: =============================================================
if exist "%ROOT%\..\fastgpt-source\projects\app\package.json" (
    echo   [OK] FastGPT 源码就绪
    set /a PASS+=1
) else (
    echo   [FAIL] FastGPT 源码未找到
    set /a FAIL+=1
)

:: =============================================================
:: 10. Check node_modules
:: =============================================================
if exist "%ROOT%\..\fastgpt-source\node_modules\.pnpm" (
    echo   [OK] node_modules 已安装
    set /a PASS+=1
) else (
    :: Check for split archive
    if exist "%ROOT%\..\fastgpt-source\node_modules.tar.gz.partaa" (
        echo   [INFO] node_modules 分卷压缩包存在，需要解压
        set /a FAIL+=1
    ) else (
        echo   [WARN] node_modules 未安装，将尝试离线安装
        set /a FAIL+=1
    )
)

:: =============================================================
:: 11. Check config/.env
:: =============================================================
if exist "%ROOT%\config\.env" (
    echo   [OK] FastGPT 环境变量配置就绪
    set /a PASS+=1
) else (
    echo   [FAIL] config\.env 缺失！
    echo         请从 .env.example 复制并修改配置
    set /a FAIL+=1
)

:: =============================================================
:: 12. Check deployment scripts
:: =============================================================
if exist "%ROOT%\scripts\mock-plugin-server.js" (
    echo   [OK] Mock 插件服务脚本就绪
    set /a PASS+=1
) else (
    echo   [WARN] Mock 插件服务脚本缺失
    set /a FAIL+=1
)

if exist "%ROOT%\scripts\fix-pnpm-symlinks.js" (
    echo   [OK] pnpm 符号链接修复脚本就绪
    set /a PASS+=1
) else (
    echo   [WARN] pnpm 修复脚本缺失
    set /a FAIL+=1
)

if exist "%ROOT%\scripts\init-minio-buckets.js" (
    echo   [OK] MinIO 存储桶初始化脚本就绪
    set /a PASS+=1
) else (
    echo   [WARN] MinIO 初始化脚本缺失
    set /a FAIL+=1
)

if exist "%ROOT%\scripts\health-check.js" (
    echo   [OK] 健康检查脚本就绪
    set /a PASS+=1
) else (
    echo   [INFO] 健康检查脚本不存在（非必需）
)

:: =============================================================
:: 13. Check node_modules symlink health
:: =============================================================
set "NODE_MODULES=%ROOT%\..\fastgpt-source\node_modules"
if exist "%NODE_MODULES%\.pnpm" (
    echo   [OK] node_modules 虚拟存储就绪
    set /a PASS+=1

    :: Quick spot-check: verify a few key packages are accessible
    set "SYMLINK_OK=1"
    for %%p in (next react axios typescript) do (
        if not exist "%NODE_MODULES%\%%p" (
            if not exist "%NODE_MODULES%\%%p\package.json" (
                if not exist "%NODE_MODULES%\%%p\index.js" (
                    if not exist "%NODE_MODULES%\%%p\index.mjs" (
                        set "SYMLINK_OK=0"
                    )
                )
            )
        )
    )
    if !SYMLINK_OK! equ 1 (
        echo   [OK] 关键包符号链接正常
    ) else (
        echo   [FAIL] 关键包符号链接断裂！
        echo         请运行: node scripts\fix-pnpm-symlinks.js
        echo         或执行: setup.bat 重新修复
        set /a FAIL+=1
    )
) else (
    echo   [WARN] node_modules 未安装或结构异常
    set /a FAIL+=1
)

:: =============================================================
:: 14. Check MongoDB keyFile (needed for auth + replica set)
:: =============================================================
if exist "%ROOT%\data\mongodb.key" (
    echo   [OK] MongoDB keyFile 就绪
    set /a PASS+=1
) else (
    echo   [INFO] MongoDB keyFile 未生成，首次启动时将自动生成
)

:: =============================================================
:: Summary
:: =============================================================
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║              预检查结果                          ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║  通过: !PASS!  失败: !FAIL!                               ║
echo  ╚══════════════════════════════════════════════════╝

if !FAIL! gtr 0 (
    echo.
    echo  [WARNING] 存在 !FAIL! 个问题
    echo  运行 setup.bat 可以自动修复部分问题
    echo  修复后再运行 verify.bat 确认，全部通过后运行 start.bat
) else (
    echo.
    echo  [OK] 所有检查通过！
    echo.
    echo  下一步:
    echo    1. setup.bat  - 安装环境（首次运行）
    echo    2. start.bat  - 启动所有服务
    echo    3. node scripts\health-check.js - 验证服务状态
    echo.
    echo  访问 http://localhost:4000 使用 root/123456 登录
)

echo.
pause