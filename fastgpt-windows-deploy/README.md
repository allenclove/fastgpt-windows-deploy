# FastGPT Windows 离线部署工具

## 这是什么

FastGPT 完整 Windows 离线部署包。不需要 Docker、不需要 Linux、不需要虚拟机、不需要联网。克隆下来就能部署。

## 适合谁

- 内网环境，无法访问互联网
- Windows 10/11 64 位
- 需要快速搭建 FastGPT 演示/开发环境

## 前置条件

- Windows 10/11 64 位
- 管理员权限（MongoDB 需要）
- 硬盘空间 >= 10GB
- Node.js >= 20.14.0（SDK 构建需要 22+，运行可使用 20.x）
- 确保以下端口未被占用：`27017`, `5432`, `6379`, `9000`, `4000`, `4004`

## 一键部署（4 步）

```batch
:: 步骤 1: 预检查（1 分钟）
verify.bat

:: 步骤 2: 安装环境（5 分钟，首次必须运行）
setup.bat

:: 步骤 3: 启动所有服务（3 分钟）
start.bat

:: 步骤 4: 健康检查（可选，验证所有服务）
node scripts\health-check.js
```

启动成功后浏览器访问 `http://localhost:4000`，用 `root` / `123456` 登录。

> **注意：** 首次访问页面需要 20-30 秒（Turbopack 编译 instrumentation），之后页面会快速加载。如果超时请刷新重试。

## 内网 AI 模型配置（重要）

FastGPT 启动后需要配置 AI 模型才能正常对话。**任选以下一个方案**：

### 方案 A：Ollama 本地模型（推荐，完全离线）

```batch
:: 1. 在有网的机器上下载 Ollama 安装包
::    https://ollama.com/download/windows
::    复制 OllamaSetup.exe 到内网机器安装

:: 2. 在有网的机器上下载模型，打包到内网
ollama pull qwen2.5:7b
ollama pull qwen2.5:14b      :: 可选，效果更好
::    模型文件位置: %USERPROFILE%\.ollama\
::    将整个 .ollama 目录复制到内网机器同位置

:: 3. config\.env 中已默认配置 Ollama，无需修改
::    OPENAI_BASE_URL=http://localhost:11434/v1
::    CHAT_API_KEY=ollama
::    HELPER_BOT_MODEL=qwen2.5:7b
```

### 方案 B：内网 vLLM / OpenAI 兼容服务

```batch
:: 修改 config\.env 中的三个变量：
::   OPENAI_BASE_URL=http://<内网服务器IP>:<端口>/v1
::   CHAT_API_KEY=<你的API密钥>
::   HELPER_BOT_MODEL=<模型名称>
```

### 方案 C：公网 API 代理转发

```batch
:: 在能访问公网的机器上运行代理（如 nginx 反向代理）
:: 修改 config\.env:
::   OPENAI_BASE_URL=http://<代理机器IP>:<端口>/v1
::   CHAT_API_KEY=<你的API密钥>
::   HELPER_BOT_MODEL=<模型名称>
```

### 在管理后台添加模型

登录 FastGPT 后，进入 **管理后台 → AI 模型配置**，添加模型。`config/.env` 中的 `HELPER_BOT_MODEL` 会自动作为默认模型。

## 停止服务

```batch
stop.bat
```

## 健康检查

启动后可在另一个终端验证所有服务是否正常运行：

```batch
node scripts\health-check.js
```

输出示例：
```
╔══════════════════════════════════════════╗
║     FastGPT Service Health Check         ║
╚══════════════════════════════════════════╝

  MongoDB             ... [OK]
  PostgreSQL          ... [OK]
  Redis               ... [OK]
  MinIO               ... [OK]
  Mock Plugin         ... [OK]
  FastGPT App         ... [OK]

  Result: 6 passed, 0 failed

  All services healthy!
  Visit http://localhost:4000 and login with root / 123456
```

## 目录结构

```
fastgpt-windows-deploy/
├── verify.bat             # 预检查：验证所有依赖是否就绪
├── setup.bat              # 安装：Node.js + 解压 node_modules + 校验 PG
├── start.bat              # 启动：依次启动所有服务
├── stop.bat               # 停止：停止所有服务
├── download-deps.bat      # 下载依赖（有网环境用）
├── bundle-offline.bat     # 打包离线 ZIP（有网环境用）
├── config/
│   ├── .env               # FastGPT 环境变量（已配置好本地服务）
│   ├── .env.example       # 环境变量参考文档
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
│   ├── mock-plugin-server.js      # Mock 插件 + 代码沙箱 + AI Proxy
│   ├── init-minio-buckets.js      # MinIO 存储桶初始化
│   └── health-check.js            # 服务健康检查
├── data/                  # 运行时数据目录（自动创建）
└── logs/                  # 日志目录（自动创建）
```

## 服务端口

| 服务 | 端口 | 用途 |
|------|------|------|
| FastGPT | 4000 | Web 应用 |
| MongoDB | 27017 | 主数据库 |
| PostgreSQL | 5432 | 向量数据库 |
| Redis | 6379 | 会话缓存 + 消息队列 |
| MinIO API | 9000 | 对象存储 |
| MinIO Console | 9001 | MinIO 管理面板 |
| Mock Plugin | 4004 | 插件 + 代码沙箱 + AI Proxy |

## 完全重置

```batch
stop.bat
rmdir /S /Q data
start.bat
```

## 故障排查

### 端口被占用

检查端口是否被其他程序占用：
```batch
netstat -ano | findstr "4000 27017 5432 6379 9000 4004"
```

### 首次访问超时

FastGPT 首次访问需要编译 instrumentation（20-30 秒），这是正常现象。刷新浏览器等待编译完成即可。

### PostgreSQL 初始化失败

```batch
:: 检查 share 目录完整性（关键！）
dir installers\pgsql\share

:: 缺失 postgres.bki 说明安装不完整
:: 重新从 PostgreSQL ZIP 解压 share/ 目录
```

### Redis 版本警告

```
It is highly recommended to use a minimum Redis version of 6.2.0
Current: 5.0.14.1
```

这是非致命警告。Redis 5.0 Windows 移植版功能受限但不影响基本使用。如需完整功能：
- 安装 Memurai (Redis Windows 替代品): https://www.memurai.com/get-memurai
- 或在 WSL2 中运行 Redis 7.x

### Redis 连接失败 (NOAUTH)

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

如果看到 `security.keyFile is required when authorization is enabled with replica sets` 错误，说明 keyFile 缺失。`start.bat` 会自动生成 keyFile 到 `data/mongodb.key`。

### MinIO 是 Git LFS 指针文件

```batch
:: 方法 1: 拉取 LFS 文件
git lfs pull

:: 方法 2: 手动下载
:: 下载地址: https://dl.min.io/server/minio/release/windows-amd64/minio.exe
:: 放入 installers\ 目录
```

### SDK 构建失败 (tsdown/rolldown)

如果 `pnpm build:sdks` 报错 `process.getBuiltinModule is not a function`，说明 Node.js 版本过低。

解决方法：
1. 安装 Node.js 22+ 用于构建
2. 或使用 `pnpm install --ignore-scripts` 跳过构建
3. SDK 已预构建，确保 `sdk/*/dist/` 目录存在即可

### 代码沙箱错误

```
[code_sandbox_error]: ECONNREFUSED
```

Mock 插件服务已集成代码沙箱 Mock，该错误不应再出现。如果仍然出现，检查 Mock 插件是否正常启动在 4004 端口。

### Web 页面加载但 API 报错

检查所有基础服务是否正常运行：
```batch
node scripts\health-check.js
```

## AI 辅助部署说明

如果你是一个 AI 模型，正在帮助用户部署本项目，请按以下顺序操作：

### 1. 环境检查

运行 `verify.bat`，解读输出。如果所有项都是 `[OK]`，继续下一步。如果有 `[FAIL]`，根据提示修复。

重点检查：
- Node.js >= 20.14.0 和 pnpm 是否可用
- PostgreSQL share 目录是否完整（`postgres.bki` 必须存在）
- MinIO 是否是真实二进制（不是 Git LFS 指针）
- `config/.env` 是否存在
- FastGPT 源码和 node_modules 是否就绪

### 2. 首次安装

运行 `setup.bat`。此脚本会：
- 检查 Node.js 和 pnpm
- 配置 MongoDB（生成 keyFile）
- 配置 PostgreSQL（校验 share 目录、安装 pgvector）
- 配置 Redis 和 MinIO
- 安装 FastGPT 依赖（解压分卷包或 pnpm install）
- 构建 SDK 包

### 3. 启动服务

运行 `start.bat`。此脚本按顺序：
1. 启动 MongoDB（初始化副本集 + 创建 fastgpt 用户 + keyFile 认证）
2. 启动 PostgreSQL（initdb + 安装 pgvector 扩展）
3. 启动 Redis
4. 启动 MinIO
5. 启动 Mock 插件服务（端口 4004，包含插件/代码沙箱/AI Proxy 模拟）
6. 初始化 MinIO 存储桶（使用 Node.js MinIO 客户端）
7. 启动 FastGPT（`PORT=4000 pnpm dev`）

**注意：** 首次启动后，第一个 HTTP 请求会触发 Turbopack instrumentation 编译（约 20-30 秒），此时请求会超时。刷新页面即可。

### 4. 验证

运行健康检查：
```batch
node scripts\health-check.js
```

所有 6 个服务应显示 `[OK]`。

然后访问 `http://localhost:4000`，应返回 FastGPT 登录页面。使用 `root` / `123456` 登录。

### 5. 配置 AI 模型

在管理后台添加 AI 模型配置，或修改 `config/.env` 中的以下变量：
- `OPENAI_BASE_URL`：AI 模型 API 端点
- `CHAT_API_KEY`：API 密钥
- `HELPER_BOT_MODEL`：模型名称

内网推荐使用 Ollama 运行本地模型。

### 已知问题与限制

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| Redis 5.0 版本偏低 | BullMQ 会打警告，基本功能正常 | 安装 Memurai 或在 WSL2 中运行 |
| Windows 保留端口 2949-3048 | 3000 端口可能不可用 | start.bat 自动检测并改用 4000 |
| 首次请求需 20-30 秒 | 用户可能以为卡住了 | 刷新浏览器重试 |
| 无 mongosh（使用 legacy mongo） | 部分高级功能可能不可用 | MongoDB 5.0 使用 mongo.exe |
| AI 模型需自行配置 | 不配置无法对话 | 推荐 Ollama + qwen2.5 |
| Agent 沙盒未包含 | Agent 模式需要额外部署 | 基本问答和工作流不需要 |
