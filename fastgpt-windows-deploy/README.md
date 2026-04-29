# FastGPT Windows 一键部署工具

## 目录结构

```
fastgpt-windows-deploy/
├── setup.bat              # 环境安装脚本
├── start.bat              # 启动所有服务
├── stop.bat               # 停止所有服务
├── download-deps.bat      # 依赖下载脚本（有网环境使用）
├── config/
│   ├── .env               # FastGPT 环境配置
│   ├── mongod.cfg         # MongoDB 配置
│   └── redis.conf         # Redis 配置
├── installers/            # 依赖安装包存放目录
│   ├── node-v20.14.0-x64.msi    # Node.js 安装包
│   ├── mongodb/                 # MongoDB 便携版
│   ├── pgsql/                   # PostgreSQL 便携版
│   ├── redis/                   # Redis Windows 版
│   ├── minio.exe                # MinIO Windows 版
│   └── pgvector/                # pgvector 扩展文件
│       ├── vector.dll
│       ├── vector.control
│       └── vector--0.8.0.sql
├── data/                  # 数据存储目录（自动创建）
└── logs/                  # 日志目录（自动创建）
```

## 快速开始

### 前提条件

- Windows 10/11 64位
- 建议以管理员身份运行所有脚本
- 确保端口 27017, 5432, 6379, 9000, 3000 未被占用

### 方式一：有网络环境

```bash
# 1. 下载所有依赖
download-deps.bat

# 2. 安装环境
setup.bat

# 3. 启动所有服务
start.bat
```

### 方式二：内网环境（无网络）

1. 在有网络的机器上运行 `download-deps.bat` 下载所有依赖
2. 将整个 `fastgpt-windows-deploy` 目录复制到内网机器
3. 运行 `setup.bat` 安装环境
4. 运行 `start.bat` 启动所有服务

## 所需组件

| 组件 | 用途 | Windows 方案 |
|------|------|-------------|
| Node.js 20.x | 运行环境 | node-v20.14.0-x64.msi |
| pnpm 10.x | 包管理器 | npm install -g pnpm |
| MongoDB 5.0 | 元数据存储 | mongod.exe (ZIP 便携版) |
| PostgreSQL 15 | 向量数据库 | pg_ctl.exe (ZIP 便携版) |
| pgvector 0.8.0 | 向量扩展 | vector.dll |
| Redis 7.x | 缓存/会话 | Memurai 或 Redis Windows 移植版 |
| MinIO | 对象存储 | minio.exe |

## 手动下载地址

### Node.js
https://nodejs.org/dist/v20.14.0/node-v20.14.0-x64.msi

### MongoDB 5.0 (ZIP 版)
https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-5.0.32.zip

解压后放入 `installers\mongodb\`

### PostgreSQL 15 便携版
https://www.enterprisedb.com/download-postgresql-binaries

下载 Windows x86-64 版本，解压后放入 `installers\pgsql\`

### pgvector
https://github.com/pgvector/pgvector/releases

下载 Windows 编译版本，将 DLL 文件放入 `installers\pgvector\`

### Redis Windows 版
- **Memurai (推荐)**: https://www.memurai.com/get-memurai
  - 免费开发版，完全兼容 Redis，支持 Windows 服务
  - 安装后自动检测，无需放入 installers 目录
- **Redis Windows 移植版**: https://github.com/tporadowski/redis/releases
  - 下载 `Redis-x64-*.zip`，解压到 `installers\redis\`

### MinIO
https://dl.min.io/server/minio/release/windows-amd64/minio.exe

放入 `installers\minio.exe`

## 访问方式

- **FastGPT 主应用**: http://localhost:3000
- **MinIO 控制台**: http://localhost:9001
- **默认账号**: root / 123456

## 服务端口

| 服务 | 端口 |
|------|------|
| FastGPT | 3000 |
| MongoDB | 27017 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

## LLM 模型配置

FastGPT 启动后，需要在管理后台配置 LLM 模型。

由于内网环境无法直接访问公网 AI API，有以下方案：

### 方案一：API 代理
如果内网有代理可以访问外网 API：
- 在系统配置中添加 OpenAI 兼容的 API 地址
- 支持所有兼容 OpenAI API 格式的服务

### 方案二：本地模型
使用 Ollama 或类似工具运行本地模型：
- 安装 Ollama Windows 版
- 在 FastGPT 中配置 Ollama 的 API 地址

### 方案三：配置已有的 AI Proxy
FastGPT 内置 AI Proxy 模块，可以统一管理多个 AI 服务商的 API Key

## 故障排除

### 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr "27017 5432 6379 9000 3000"
```

### MongoDB 无法启动
1. 检查是否以管理员身份运行
2. 删除 `data\mongodb` 目录后重试
3. 检查 `data\mongodb\.initialized` 文件是否存在，如初始化失败请删除此文件

### PostgreSQL 无法启动
```bash
# 手动初始化
installers\pgsql\bin\initdb.exe -D data\pg -U fastgpt -E UTF8

# 手动启动
installers\pgsql\bin\pg_ctl.exe start -D data\pg -l logs\pg.log
```

### pnpm install 失败
```bash
# 清理缓存后重试
pnpm store prune
pnpm install --no-frozen-lockfile
```

### 重置所有数据
```bash
# 运行 stop.bat 后，删除 data 目录
rmdir /S /Q data
# 重新运行 start.bat 会自动初始化
```
