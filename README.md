# 心屿智伴

心屿智伴是一个用中文对话的本地桌面陪伴 Agent。小屿可以根据你授权的记忆和资料，帮你安排目标、专注计时和提醒。涉及写入时，先让你在确认卡上检查，再执行。

## 可以做什么

- **整理眼前的安排**。用自然语言提出目标、专注或提醒，在成长页查看实际进度。提醒由本机后台调度，重启后会补查到期事项。
- **使用自己授权的资料**。在记忆页导入 PDF、TXT 或 Markdown。资料默认供本地检索，逐份开启分享后，小屿可在对话里引用，并定位到对应段落。
- **从上次确认继续**。每张待确认卡都有独立的 SQLite 检查点，重启后可以继续确认或拒绝。重复确认复用已有结果。
- **记录日常**。在像素小岛和房间里对话、记录情绪、管理记忆与画像。场景、衣橱和声音可在界面调整。

## 本地运行

需要 Node.js 24.14.0 和 pnpm 10.34.1。在仓库根目录执行：

```sh
cd web
pnpm install --frozen-lockfile
pnpm run doctor
pnpm dev
```

打开 [http://127.0.0.1:5178](http://127.0.0.1:5178)。无需模型密钥即可体验本地任务和资料管理。

使用 AI 对话时，把 `web/.env.example` 复制为 `web/.env.local`，填入自己的 `DEEPSEEK_API_KEY` 后重启。模型标识通过 `DEEPSEEK_MODEL` 设置。密钥只保存在本机服务端配置。[完整配置与生产启动](web/README.md)

## LangGraph.js 架构

```text
Svelte 界面 → 本机 Node.js 网关 → LangGraph 对话图 → DeepSeek
                                      ├─ 读取已授权的记忆、资料和进度
                                      └─ 写入提议 → 审批图暂停 → 用户确认 → SQLite 事务
```

对话图调度 8 个工具。查询工具直接返回结果；写入工具产生确认卡。审批图通过 `interrupt()` 等待用户决定，确认时从 SQLite 检查点恢复。SQLite 事务和确认回执负责防止重复执行。聊天正文和检索片段只参与本轮对话，审批检查点只保存流程所需的控制状态。[架构与代码入口](web/docs/ARCHITECTURE.md)

## 开发与验收

在 `web` 目录运行：

```sh
pnpm check
pnpm test
pnpm test:gateway
pnpm test:agent
pnpm eval:agent
pnpm build
pnpm test:startup
```

自动化测试使用工程模型替身。手动验收时，让小屿提出提醒，在确认前关闭后台，然后使用同一数据库重启。回到原对话确认，在成长页检查只生成一条提醒。

- [备份、迁移和评测命令](docs/agent-upgrade/08_开发交接与迁移.md)
- [工程评测与真实模型抽测记录](docs/agent-upgrade/09_匿名工程评测.md)
- [许可证和第三方素材来源](THIRD_PARTY.md)
