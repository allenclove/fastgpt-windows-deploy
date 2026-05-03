@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title FastGPT - 离线包打包工具

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║      FastGPT - 离线部署包打包工具                ║
echo  ║      在有网络的机器上运行，生成离线部署包         ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "SOURCE=%ROOT%\..\fastgpt-source"
set "PKG_DIR=%ROOT%\..\fastgpt-offline-pkg"

if not exist "%SOURCE%" (
    echo [ERROR] fastgpt-source 目录不存在
    echo 请先运行: git clone https://github.com/labring/FastGPT.git fastgpt-source
    pause
    exit /b 1
)

echo [步骤 1/4] 安装 FastGPT npm 依赖到本地缓存...
cd /d "%SOURCE%"

:: 设置 pnpm store 到本地目录，方便打包
set "PNPM_STORE_PATH=%SOURCE%\.pnpm-store"
pnpm config set store-dir "%PNPM_STORE_PATH%"

echo   正在安装依赖 (首次可能需要 5-15 分钟)...
pnpm install

if %errorlevel% neq 0 (
    echo [ERROR] pnpm install 失败
    pause
    exit /b 1
)

echo [OK] 依赖安装完成
echo.

echo [步骤 2/4] 构建 SDK 包...
pnpm build:sdks
if %errorlevel% neq 0 (
    echo [WARNING] build:sdks 失败，尝试继续
)
echo.

echo [步骤 3/4] 创建离线部署包...
if exist "%PKG_DIR%" (
    echo   删除旧的打包目录...
    rmdir /S /Q "%PKG_DIR%"
)

mkdir "%PKG_DIR%"
mkdir "%PKG_DIR%\fastgpt-source"
mkdir "%PKG_DIR%\fastgpt-windows-deploy"

:: 复制 fastgpt-source (排除 .git 和 .pnpm-store 以减小体积)
echo   复制源码 (排除 .git)...
robocopy "%SOURCE%" "%PKG_DIR%\fastgpt-source" /E /NFL /NDL /XD ".git" ".pnpm-store" /XF ".gitignore" ".gitmodules"

:: 复制 pnpm store
echo   复制 pnpm 依赖缓存...
if exist "%PNPM_STORE_PATH%" (
    robocopy "%PNPM_STORE_PATH%" "%PKG_DIR%\fastgpt-source\.pnpm-store" /E /NFL /NDL
)

:: 复制部署工具
echo   复制部署工具...
robocopy "%ROOT%" "%PKG_DIR%\fastgpt-windows-deploy" /E /NFL /NDL /XD "temp_downloads" "data" "logs"

:: 创建 .npmrc 指向本地 store
echo store-dir=./.pnpm-store > "%PKG_DIR%\fastgpt-source\.npmrc"
echo prefer-offline=true >> "%PKG_DIR%\fastgpt-source\.npmrc"

echo [OK] 离线包创建完成
echo.

echo [步骤 4/4] 打包为 ZIP...
set "ZIP_FILE=%ROOT%\..\fastgpt-offline-windows-deploy.zip"

:: 使用 PowerShell 压缩
powershell -Command "Compress-Archive -Path '%PKG_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

if exist "%ZIP_FILE%" (
    for %%f in ("%ZIP_FILE%") do (
        set "ZIP_SIZE=%%~zf"
        set /a "ZIP_SIZE_MB=!ZIP_SIZE! / 1048576"
    )
    echo.
    echo  ╔══════════════════════════════════════════════════╗
    echo  ║            打包完成！                           ║
    echo  ╠══════════════════════════════════════════════════╣
    echo  ║  文件: fastgpt-offline-windows-deploy.zip       ║
    echo  ║  大小: !ZIP_SIZE_MB! MB                           ║
    echo  ╠══════════════════════════════════════════════════╣
    echo  ║  内网部署步骤:                                  ║
    echo  ║  1. 复制 ZIP 文件到内网 Windows 机器            ║
    echo  ║  2. 解压到任意目录                             ║
    echo  ║  3. 运行 fastgpt-windows-deploy\setup.bat      ║
    echo  ║  4. 运行 fastgpt-windows-deploy\start.bat      ║
    echo  ╚══════════════════════════════════════════════════╝
) else (
    echo [WARNING] ZIP 打包失败，请手动复制 %PKG_DIR%
)

echo.
pause