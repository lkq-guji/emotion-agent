# 心屿智伴 · 桌面陪伴 Agent

Svelte 5 + TypeScript 中文像素界面，使用本机 Node 服务连接你配置的模型。小屿可以检索已授权记忆，提出目标、专注和提醒；需要写入时先给你确认卡，确认后真实保存。

## 第一次启动

安装 Node.js 24 LTS（验证版本 24.14.0）和 pnpm 10.34.1，在本目录执行：

~~~sh
pnpm install --frozen-lockfile
pnpm run doctor
pnpm dev
~~~

访问 http://127.0.0.1:5178，首次需同意条款。无需密钥也能在成长页管理目标、提醒和专注计时；AI 对话需要你自己的模型配置。

## 接入模型

复制 .env.example 为 .env.local：PowerShell 使用 Copy-Item .env.example .env.local；macOS/Linux 使用 cp .env.example .env.local。已有配置请保留。

~~~dotenv
DEEPSEEK_API_KEY=填写自己的密钥
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_TIMEOUT_SECONDS=120
XINYU_AGENT_DB=.runtime/xinyu-agent.sqlite3
~~~

重启后在“我的 → 模型连接”查看状态。密钥只由服务端读取，不添加 VITE_ 前缀、不提交、不截图分享。也支持 XINYU_API_KEY、XINYU_MODEL、XINYU_BASE_URL 配置其他 OpenAI 兼容服务。模型名以 [DeepSeek 官方文档](https://api-docs.deepseek.com/) 和账号实际可用模型为准。

陪伴助手使用本机网关的模型。需要沿用其他已配置模型时，切换为自由聊天。两种对话使用同一份聊天记录。

## 一次完整体验

1. 在“记忆”开启长期记忆；开启后仍逐条确认。
2. 对小屿说“请记住，我学习英语喜欢每次25分钟”，检查并确认记忆卡。
3. 新建对话，说“帮我安排今晚的英语学习”；小屿可检索该偏好，提出计划。
4. 检查提醒的本地时间和计划内容。确认前不会创建任务，确认后在成长页管理。
5. 到期后应用内提示。可以完成、改期、取消，或将回顾草稿交给小屿再发送。

普通聊天可以直接回应，工具由模型按需求选择，不保证每句话都会生成卡片。模型失败会显示错误，不返回固定演示回复。

## 存储与提醒

聊天、日记、已确认记忆、画像和自定义媒体继续保存在此浏览器。后台 SQLite 保存目标、提醒、计时和执行状态，默认文件为 .runtime/xinyu-agent.sqlite3；禁止提交数据库及其 WAL/SHM 文件。

同一浏览器通过私人 HttpOnly Cookie 恢复任务空间。旧目标首次连接导入一次，之后以任务库为准；完成状态同步回旧存档，删除时清理对应的旧记录与备份，避免再次导入。新任务只保存在任务库。

后台运行时每秒检查到期；界面轮询展示。关闭页面不会丢失任务；关闭后台时不会发送提醒，重启后补查已到期事项。当前只在应用内提示，不发送微信、短信、邮件或系统推送。

清除全部数据会先清这个浏览器的后台任务空间，再清浏览器记录。仅手动清除浏览器 Cookie 不会删除后台文件；需要重新开始时先用应用的数据管理。应用锁保护界面，不加密磁盘文件。当前服务只监听本机，不作为公网多用户服务。

需要备份任务时，先正常关闭后台，再保留数据库文件；不要把私人数据库放入 Git。Node 内置 SQLite 在固定版本可能打印实验性提示，升级 Node 前请运行相关回归。

## 构建与检查

~~~sh
pnpm build
pnpm start
~~~

生产仍访问 http://127.0.0.1:5178。PORT 可修改端口；XINYU_ENV_FILE 可指定环境文件。pnpm preview 仅预览静态页面，不提供 Agent 后台。

~~~sh
pnpm check
pnpm test
pnpm test:gateway
pnpm test:agent
pnpm verify:assets
pnpm verify:repo
pnpm build
pnpm test:startup
pnpm exec playwright install chromium
pnpm test:e2e
~~~

浏览器测试使用独立服务器、内存任务库和明确标记的工程模型替身；不调用你的 API，不证明真实模型质量。Linux CI 安装浏览器时使用 pnpm exec playwright install --with-deps chromium。

## 接手资料

- [产品计划](../docs/PRODUCT_PLAN.md) 与 [当前状态](../docs/STATUS.md)
- [架构](docs/ARCHITECTURE.md) 与 [后续开发](docs/TEAM_HANDOFF.md)
- [开源与素材来源](docs/THIRD_PARTY.md)

比赛材料已归档到 archive/competition/，不再是产品的运行依赖或开发目标。原聊天与存储基础保留在 src/ts 和 src/lib，像素产品与 Agent 交互位于 src/xinyu，构建为一个前端。
