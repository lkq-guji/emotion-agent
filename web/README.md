# 心屿智伴 · 桌面应用

当前可交接的 Svelte 5 + TypeScript 中文像素陪伴界面。含小岛首页、真实模型对话、情绪日记、授权记忆、画像、成长、衣橱、动态窗景和个人设置。

**没有预置密钥或用户记录。** 不配置模型也能打开界面和使用本地记录；聊天需每位成员接入自己的模型。请求失败会显示错误，不回退为固定假回复。

## 第一次启动

安装 Node.js 24 LTS（本次使用 24.14.0）和 pnpm 10.34.1：

```sh
npm install --global pnpm@10.34.1
git clone --branch develop https://github.com/lkq-guji/emotion-agent.git
cd emotion-agent/web
pnpm install --frozen-lockfile
pnpm run doctor
pnpm dev
```

访问 **http://127.0.0.1:5178**，首次需自行同意条款。`main` 为已验收版本，`develop` 为下一步开发入口。已有仓库的成员保存自己的修改后先 `git pull --ff-only`，再进入 `web`。

## 自行接入 DeepSeek

1. 复制示例配置。PowerShell：`Copy-Item .env.example .env.local`；macOS/Linux：`cp .env.example .env.local`。已有 `.env.local` 时保留自己的配置，不覆盖。
2. 用文本编辑器打开 `.env.local`，填写自己的密钥，例如：

```dotenv
DEEPSEEK_API_KEY=填写你自己的密钥
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_TIMEOUT_SECONDS=120
```

3. 重启 `pnpm dev`，在“我的 → 模型连接”查看状态，必要时点击“使用本机网关”。

示例文件中的密钥默认为空；上面中文是填写说明，不是可用凭据。模型名以 [DeepSeek 官方文档](https://api-docs.deepseek.com/) 和自己账号可用模型为准。不要给密钥变量加 `VITE_` 前缀，不要提交 `.env.local`，不要在聊天、截图和日志里共享密钥。

也支持 `XINYU_API_KEY` / `XINYU_MODEL` / `XINYU_BASE_URL` 覆盖为其他 OpenAI 兼容服务。密钥仅由服务器读取；外部 API 请求不会由浏览器直接携带服务器密钥。

## 构建和本机运行

```sh
pnpm build
pnpm start
```

同样访问 http://127.0.0.1:5178。`pnpm start` 读取自己的 `.env.local`；`PORT` 可修改生产端口，`XINYU_ENV_FILE` 可指定其他环境文件。`pnpm preview` 仅预览静态文件，不提供模型网关。

当前网关只监听本机，校验同源访问与会话，不应直接当作多用户公网服务。聊天、情绪、记忆与画像保存在当前浏览器；应用锁保护界面访问，不等于数据库加密。自定义背景也只属于本浏览器，不随代码上传。

## 开发检查

```sh
pnpm check
pnpm test
pnpm test:gateway
pnpm verify:assets
pnpm verify:repo
pnpm build
pnpm test:startup
```

界面回归先安装测试浏览器：

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Linux CI 首次使用 `pnpm exec playwright install --with-deps chromium`。测试会在 5190 启动独立无密钥开发服务器，使用标明用途的工程接口替身检查请求与存储，不消耗你的 DeepSeek 额度，也不证明真实模型质量。可用 `pnpm test:smoke` 只运行窗景、首次进入和媒体回归。

`XINYU_TEST_URL` 可指定已运行的测试服务；`XINYU_BROWSER` 可指定浏览器可执行文件。仓库配置没有个人电脑的绝对路径。逐像素读取的窗景用例在独立软件渲染项目中运行；CI 使用软件渲染，降低显卡驱动差异。

## 接手前必读

- [架构与修改入口](docs/ARCHITECTURE.md)
- [下一步任务与验收](docs/TEAM_HANDOFF.md)
- [素材与开源来源](docs/THIRD_PARTY.md)
- [项目总状态](../docs/STATUS.md) 和 [三人协作约定](../TEAM.md)

上游聊天/存储保留在 `src/ts`、`src/lib`，心屿产品界面在 `src/xinyu`。它们构建为一个前端，没有额外 React 应用。上游固定提交和许可记录在 `docs/xinyu/UPSTREAM.json`，GPL v3 原文保留在本目录 `LICENSE`。
