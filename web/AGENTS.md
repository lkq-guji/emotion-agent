# 心屿桌面应用接手规则

本目录是当前可运行的个人陪伴 Agent。比赛开发线已退出主线；先读 README、../docs/PRODUCT_PLAN.md、docs/ARCHITECTURE.md、docs/TEAM_HANDOFF.md 和 ../docs/STATUS.md。

- 只验收桌面端。保持 Svelte 5 / TypeScript 和既有 CSS `--xy-*`，不再增加一个 React 前端。
- 用户记录、模型密钥、`.env.local`、浏览器 profile、node_modules、dist、trace、截图和运行日志不得提交。只有 `.env.example` 可入库，密钥字段为空。
- 保留现有存档格式及原 GPL/作者声明。心屿状态扩展和自定义媒体的迁移、删除与授权必须可验证；不要为了页面调整清空真实记录。
- 真实 API 失败应显示失败，不返回固定演示内容。测试接口替身只能用于隔离的工程测试，不能替代产品对话。
- Agent 写入必须有可检查的确认步骤，完成后以真实存储结果返回。提醒由后台调度，重启后恢复；不以浏览器定时器代替持久任务。
- 浏览器记录和后台 SQLite 都属于个人数据。新增数据应覆盖权限、迁移、撤销和删除，并保留原存档兼容。
- 完整人物与猫贴合桌面，禁止分肢体拼装或抬高整个精灵。不要恢复透明重复树影/水图；窗格遮罩只用于已有 v3 原画的已知窗口。
- 同一视频 source key 不因天气/保存偏好重建。环境音与角色语音独立，收起房间暂停画面但不重启环境音。保留键盘语义和减少动态行为。
- 开始检查：`pnpm run doctor`；日常 `pnpm check`、`pnpm test`、`pnpm test:gateway`、`pnpm test:agent`。发布前再跑资源/仓库检查、构建、无密钥启动和受影响浏览器用例。
- `pnpm test:e2e` 会使用 5190 的独立无密钥测试服务器和便携 Chromium。不要删除失败用例来获得通过，不把工程测试结果当作模型准确率。
- 新增静态素材需更新 docs/runtime-assets.json，保留来源/授权。不要把私人数据库、上传媒体或模型权重放进 public。
