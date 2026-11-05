# 架构与开发入口

## 运行链路

~~~text
像素界面 / 对话
  → src/xinyu/bridge.svelte.ts
  → src/xinyu/agent.svelte.ts
  → /xinyu-api/agent/runs
  → server/xinyu/agent.mjs（受限工具循环）
  → 服务端配置的 DeepSeek / OpenAI 兼容模型
  → 读取记忆 / 查询进展 / 生成待确认动作
  → 用户确认
  → agent-store.mjs（SQLite 事务）
  → 后台调度与界面回执
~~~

自由聊天继续使用原 sendChat 与 /xinyu-api/chat/completions，不改原聊天格式。网关用 agent=true 声明新能力，旧网关没有该能力时保留原聊天与浏览器目标。

开发由 Vite 挂载同一网关，生产由 server/xinyu/start.mjs 提供页面与 API。无密钥可以管理本机任务；AI 请求返回明确的未配置错误。

## 核心文件

| 任务 | 入口 |
| --- | --- |
| 应用外壳、小岛与房间 | XinyuApp.svelte、components/IslandScene.svelte、components/PixelRoom.svelte |
| 原聊天与 Agent 分流 | src/xinyu/bridge.svelte.ts、pages/Chat.svelte |
| Agent 客户端、轮询与确认 | src/xinyu/agent.svelte.ts |
| 动作卡、任务管理、到期提示 | components/AgentActions.svelte、AgentWorkspace.svelte、AgentNotice.svelte |
| 工具白名单、模型循环、HTTP | server/xinyu/agent.mjs、gateway.mjs |
| 参数、事务、状态与调度 | server/xinyu/agent-store.mjs |
| 有预算的记忆检索 | src/xinyu/memoryRetrieval.mjs |
| 情绪、画像、授权数据 | domain.ts、companionship.ts、EmotionJourney.svelte、ProfileArchive.svelte |
| 场景、衣橱、声音 | sceneLibrary.ts、sceneryMotion.ts、wardrobe.ts、ambience.svelte.ts |

## 数据边界

聊天、已确认记忆、画像、情绪和视觉偏好继续在原 SaveKV 扩展中保存，CompanionData.version=1。新字段按需迁移。自定义媒体仍在 IndexedDB，不因工具或天气保存重建播放器。

后台默认使用 .runtime/xinyu-agent.sqlite3，包含独立任务空间、运行、待确认动作与目标/提醒/专注记录。持久 HttpOnly Cookie 对应任务空间；同源会话仍由网关检查。此机制用于本机产品，不替代公网身份认证或磁盘加密。

旧目标只导入一次，保留原字段以兼容旧存档，之后以任务库状态为准。已有旧目标的名称、完成时间与状态同步回原存档；删除时也清除旧存档与备份中的对应记录，不会因再次连接而重新导入。新任务只保存在任务库，不额外复制到浏览器目标列表。

每轮只传递已授权的记忆候选给本机 Agent，模型只接收检索结果。画像只包含用户确认且启用的事实。记忆候选先存为待确认动作，确认后写入浏览器；存档成功才回执。所有动作执行、拒绝或过期后清除参数原文；原聊天中的文字仍由来源对话管理。

删除来源对话会删除其后台运行、候选与关联任务；已确认记忆仍按原来源一起清理。清除全部数据先清任务空间，再清浏览器及本机备份；服务无法连接时保留浏览器记录并提示重试。

## 执行约定

工具为 search_memory、remember_preference、create_goal、update_goal、manage_focus、manage_reminder、get_progress。模型不能直接执行任意脚本、访问任意 URL 或绕过确认。

写入通过 SQLite 事务执行，重复确认复用结果。复合目标包含计时和提醒时共同成功或回滚。后台每秒标记到期；打开页面后轮询显示，重启补查错过事项。不会自动发送外部消息或主动消耗模型额度。

Agent 循环最多五轮模型请求、十次工具调用，并有总超时与返回用量上限；失败和停止保留可检查状态。轮次重复请求复用已完成答案；界面只展示工具摘要和结果，不展示模型内部思考。

只验收桌面端，保留同桌与沉浸布局、原 CSS 语义色、键盘与减少动态行为。素材校验见 runtime-assets.json；开源来源见 THIRD_PARTY.md 与 xinyu/ 下的元数据。
