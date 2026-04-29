# FastGPT Windows 离线部署工具

## 这是什么

FastGPT 完整 Windows 离线部署包。不需要 Docker、不需要 Linux、不需要虚拟机、不需要联网。克隆下来就能部署。

## 适合谁

- 内网环境，无法访问互联网
- Windows 10/11 64 位
- 需要快速搭建 FastGPT 演示环境

## 前置条件

- Windows 10/11 64 位
- 管理员权限（MongoDB 需要）
- 硬盘空间 >= 10GB
- 确保以下端口未被占用：`27017`, `5432`, `6379`, `9000`, `4000`, `4004`

## 一键部署（3 步）

```batch
:: 步骤 1: 预检查（1 分钟，检查所有依赖是否就绪）
verify.bat

:: 步骤 2: 安装环境（5 分钟，解压 node_modules、验证 PG 完整性）
setup.bat

:: 步骤 3: 启动所有服务（3 分钟，自动启动数据库 + FastGPT）
start.bat
```

启动成功后浏览器访问 `http://localhost:4000`，用 `root` / `123456` 登录。

## 停止服务

```batch
stop.bat
```

## 目录结构

```
fastgpt-windows-deploy/
├── verify.bat             # 预检查：检查所有依赖是否就绪
├── setup.bat              # 安装：Node.js + 解压 node_modules + 校验 PG
├── start.bat              # 启动：依次启动 MongoDB/PG/Redis/MinIO/FastGPT
├── stop.bat               # 停止：停止所有服务
├── download-deps.bat      # 下载依赖（有网环境用）
├── bundle-offline.bat     # 打包离线 ZIP（有网环境用）
├── config/
│   ├── .env               # FastGPT 完整环境变量（已配置好）
│   ├── mongod.cfg         # MongoDB 配置
│   └── redis.conf         # Redis 配置
├── installers/            # 所有 Windows 依赖
│   ├── node-v20.14.0-x64.msi      # Node.js
│   ├── mongodb/                   # MongoDB 5.0
│   ├── pgsql/                     # PostgreSQL 15
│   ├── redis/                     # Redis 5.0 (Windows 移植版)
│   ├── minio.exe                  # MinIO 对象存储
│   └── pgvector/                  # pgvector 扩展
├── scripts/
│   └── mock-plugin-server.js      # Mock 插件服务
├── data/                  # 运行时数据目录（自动创建）
└── logs/                  # 日志目录（自动创建）
```

## 服务端口

| 服务 | 端口 |
|------|------|
| FastGPT | 4000 |
| MongoDB | 27017 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
| Mock Plugin | 4004 |

## LLM 模型配置

FastGPT 启动后需要配置 AI 模型才能正常对话。登录后在后台管理页面添加模型。

模型配置文件在 `config/.env`，默认已配置了 OpenAI 兼容的 API 端点。修改以下变量即可切换模型：

```ini
OPENAI_BASE_URL=<你的 API 端点>
CHAT_API_KEY=<你的 API Key>
HELPER_BOT_MODEL=<模型名称>
```

内网环境若无公网 API，可选择：
- 从可以访问 API 的机器上代理转发
- 使用 Ollama 等工具运行本地模型

## 故障排查

### 端口 3000 无法使用

Windows Hyper-V 保留了端口 2949-3048。本工具已自动检测并改用 4000。若 4000/4004 也被占用，修改 `config/.env` 中的端口后重试。

### PostgreSQL 初始化失败

```batch
:: 检查 share 目录完整性（关键！）
dir installers\pgsql\share

:: 缺失 postgres.bki 说明安装不完整
:: 重新从 PostgreSQL ZIP 解压 share/ 目录
```

### Redis 连接失败

```
NOAUTH Authentication required
```

原因：Redis 5.x 不支持用户名认证。`.env` 中 REDIS_URL 格式必须是：
```
redis://:password@host:port    （正确）
redis://user:password@host:port （错误）
```

### MongoDB 连接失败

确保以管理员身份运行 `start.bat`。MongoDB 需要初始化副本集，首次启动需 10-15 秒。

### 插件服务错误

```
[plugin_error]: Request failed
```

原因：FastGPT 启动时必须连接插件服务。本工具已包含 Mock 插件服务（自动启动在 4004 端口）。若该服务未启动，手动运行：

```batch
node scripts\mock-plugin-server.js
```

### 完全重置

```batch
stop.bat
rmdir /S /Q data
start.bat
```

## AI 辅助部署说明

如果你是一个 AI 模型，正在帮助用户部署本项目，请按以下顺序操作：

### 1. 环境检查

运行 `verify.bat`，解读输出。如果所有项都是 `[OK]`，继续下一步。如果有 `[FAIL]`，根据提示修复。

### 2. 首次安装

运行 `setup.bat`。此脚本会：
- 安装 Node.js（调用 MSI）
- 安装 pnpm（npm install -g pnpm）
- 从分卷压缩包解压 node_modules（`cat node_modules.tar.gz.part* | tar -xzf -`）
- 校验 PostgreSQL share 目录完整性
- 配置 pgvector 扩展

### 3. 启动服务

运行 `start.bat`。此脚本按顺序：
1. 启动 MongoDB（初始化副本集 + 创建 fastgpt 用户）
2. 启动 PostgreSQL（initdb + 安装 pgvector 扩展）
3. 启动 Redis
4. 启动 MinIO
5. 启动 Mock 插件服务
6. 初始化 MinIO 存储桶
7. 启动 FastGPT（`PORT=4000 pnpm dev`）

### 4. 验证

访问 `http://localhost:4000`，应返回 FastGPT 登录页面。

### 5. LLM 配置

引导用户在管理后台添加 AI 模型配置。`config/.env` 中的配置会自动生效，也可在 UI 中手动添加。

### 已知问题

- `Windows 保留端口 2949-3048`：start.bat 自动检测并避开
- `Redis NOAUTH`：.env 已使用正确格式 `redis://:password@host`
- `PostgreSQL share 缺失`：setup.bat 自动校验完整性
- `插件 fetch failed`：start.bat 自动启动 mock 插件服务
