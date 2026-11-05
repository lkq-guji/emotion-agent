# 接手心屿智伴

当前用户已取消比赛，目标是一个可使用、可展示、可扩展的个人陪伴 Agent。不要继续执行归档文档的训练、官方输出或赛事提交任务。

1. 阅读 PRODUCT_PLAN.md、STATUS.md、../web/README.md 和 ../web/docs/ARCHITECTURE.md。
2. 在 web/ 使用 Node 24.14.0 / pnpm 10.34.1。先运行 pnpm run doctor。
3. 保存用户修改和原存档。长期记忆、画像需要用户授权；新记忆和 Agent 写入需可检查的确认。
4. 修改 Agent 时检查模型请求、参数校验、工具结果回传、超时/停止、幂等、SQLite、重启恢复、界面与删除路径。
5. 日常运行 pnpm check、pnpm test、pnpm test:gateway、pnpm test:agent。发布前运行构建、启动与受影响桌面回归。
6. 模型密钥只在服务端。真实 API 失败明确显示错误，不以固定回复兜底。

目录内 AGENTS.md 说明当前贡献规则；archive/competition/ 的文档是历史资料。
