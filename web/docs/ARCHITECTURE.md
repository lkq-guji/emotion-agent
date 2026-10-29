# 架构与开发入口

## 运行链路

```text
浏览器 Svelte 界面
  → src/xinyu/bridge.svelte.ts
  → 原聊天编排 / 模型请求
  → /xinyu-api（同源会话）
  → server/xinyu/gateway.mjs
  → 各成员自行配置的 DeepSeek / OpenAI 兼容服务
```

开发模式由 Vite 挂载同一个网关；生产模式由 `server/xinyu/start.mjs` 提供 dist 和网关。没有密钥时 health 返回 configured=false，模型请求返回明确的 503，界面仍可打开。

仓库根目录的 Python `emotion_agent/` 仍是正式比赛接口骨架。**网页目前没有调用这个 Python engine**；接入正式模型需要另写适配层，不能把网页可聊天视为比赛模型已经交付。

## 修改位置

| 任务 | 入口 |
| --- | --- |
| 应用外壳、导航、顶栏 | `src/xinyu/XinyuApp.svelte`、`navigation.ts` |
| 小岛与进屋 | `components/IslandScene.svelte`、`islandEnvironment.ts`、`landscapeMotion.ts` |
| 聊天、停止、重试、历史 | `pages/Chat.svelte`、`bridge.svelte.ts` |
| 全景房间、窗格、桌面锚点 | `components/PixelRoom.svelte`、`panoramaRoom.ts`、`windowGlass.ts` |
| 场景与水流 | `components/SceneLibrary.svelte`、`sceneryMotion.ts`、`waterShader.ts` |
| 本地图片/视频 | `sceneLibrary.ts`、`sceneSource.ts` |
| 情绪、日记 | `components/EmotionJourney.svelte`、`components/DiaryBook.svelte`、`companionship.ts` |
| 记忆与画像授权 | `domain.ts`、`bridge.svelte.ts`、`components/ProfileArchive.svelte` |
| 独立声音、天气、日夜 | `ambience.svelte.ts`、`weather.ts`、`theme.ts` |
| 服装与完整角色 | `wardrobe.ts`、`integratedSprites.ts` |
| 网关/本机服务 | `server/xinyu/` |

## 数据边界

心屿数据使用原存档的 SaveKV 扩展，`CompanionData.version=1`，新增字段按需迁移，不重写原聊天结构。设置、日记、记忆、画像和目标都持久化；本次交付没有任何个人存档。

自定义背景的 Blob 存在 IndexedDB `xinyu.local-scenes.v1`，存档仅保存元数据。删除背景和清除本机数据覆盖这些 Blob。媒体由稳定 source key 管理；不得依赖每次保存都会克隆的整份数组重新加载视频。

长期记忆和画像默认关闭，逐条确认后才参与对话。当前实现把允许内容注入上下文，尚不是经过质量评测的自动记忆检索服务。情绪分析是额外模型请求，结果可更正；画像推断须用户确认。

## 图层与性能约定

只使用完整小屿和猫精灵，不拆头/手/身体。角色与桌面共用相机，手/爪底沿锚定桌边。窗景在 v3 原木框与花叶之后，遮罩仅识别既定窗格，不对蓝色墙面猜色。

云、水、瀑布和植被按区域连续取样，禁止重叠透明树影或水图。收起房间保留同一实例，静止后虚化并移除热点，展开不重建解码器。减少动态/无 WebGL 保留完整静态图。

环境音与角色语音独立；控件、灯光、页面和保存状态不应重建环境播放器。代码中的 `--xy-*` 为现有 CSS 语义色，保持一套样式和前端系统。

素材源记录见 `xinyu/*ASSETS*.json`、`*REFERENCES*.json`；当前交付文件摘要见 `runtime-assets.json`。素材更新后同步摘要，再运行 `pnpm verify:assets`。
