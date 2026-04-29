@echo off
chcp 65001 >nul
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

for %%p in (3000 3002 3004 3005) do (
    netsh interface ipv4 show excludedportrange protocol=tcp 2>&1 | findstr "%%p" >nul
    if !errorlevel! equ 0 (
        echo   [WARN] 端口 %%p 在 Windows 保留范围内，建议换用 4xxx
        set /a FAIL+=1
    )
)

echo.
echo [2] 检查依赖文件完整性...

:: =============================================================
:: 2. Check Node.js
:: =============================================================
where node >nul 2>&1
if %errorlevel% neq 0 (
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
if %errorlevel% neq 0 (
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
if exist "%ROOT%\installers%\minio.exe" (
    echo   [OK] MinIO portable 就绪
    set /a PASS+=1
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
    echo   [WARN] node_modules 未安装，将尝试离线安装
    set /a FAIL+=1
)

:: =============================================================
:: 11. Check mock plugin server
:: =============================================================
if exist "%ROOT%\scripts\mock-plugin-server.js" (
    echo   [OK] Mock 插件服务脚本就绪
    set /a PASS+=1
) else (
    echo   [WARN] Mock 插件服务脚本缺失
    set /a FAIL+=1
)

:: =============================================================
:: Summary
:: =============================================================
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║              预检查结果                          ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║  通过: %PASS%  失败: %FAIL%                               ║
echo  ╚══════════════════════════════════════════════════╝

if %FAIL% gtr 0 (
    echo.
    echo  [WARNING] 存在 %FAIL% 个问题，请先解决再运行 start.bat
    echo  运行 setup.bat 可以自动修复部分问题
) else (
    echo.
    echo  [OK] 所有检查通过，可以运行 start.bat 启动
)

echo.
pause
