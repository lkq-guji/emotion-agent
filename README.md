# 心屿智伴 · 个人陪伴 Agent

一个以像素小岛和房间为界面的中文陪伴项目。小屿可以倾听、检索你授权的记忆，提出目标、提醒和专注安排；执行前由你确认，确认后保存到本机任务库。

当前面向桌面、本机单用户使用。模型由你自行配置的 DeepSeek / OpenAI 兼容服务提供；没有密钥也能管理本机目标、提醒和计时，AI 对话会明确提示未配置。

## 启动

使用 Node.js 24 LTS（验证版本 24.14.0）与 pnpm 10.34.1，在仓库内运行：

~~~sh
cd web
pnpm install --frozen-lockfile
pnpm run doctor
pnpm dev
~~~

打开 http://127.0.0.1:5178。复制 web/.env.example 为 web/.env.local，填写自己的 DeepSeek 密钥后重启。详细配置见 [网页运行说明](web/README.md)。

## 当前功能

- 小岛首页、进屋转场、同桌与沉浸对话、完整历史、停止和重试。
- Agent 工具循环：相关记忆检索、记忆候选、小目标、专注计时、提醒管理、真实进展回顾。
- 写入工具只产生待确认卡；确认后实际执行。重复确认与重试不重复创建。
- SQLite 持久化目标、提醒、执行状态；后台调度，重启补查到期事项。
- 情绪日记、可更正画像、授权与删除、完整角色衣橱、动态窗景、日夜与独立音效。

提醒在本机后台运行时调度，并在应用内展示；后台关闭期间不发送通知，重启后显示已到期的约定。应用锁保护界面访问，不加密设备文件。

## 工程结构

~~~text
web/                    Svelte 5 + TypeScript，一个前端与本机 Node 服务
  src/xinyu/            像素界面、聊天桥接、授权记忆与 Agent 交互
  server/xinyu/         模型网关、工具循环、SQLite、后台调度
  tests/                桌面与纯逻辑回归
  .runtime/             私人数据库、测试结果与运行文件，禁止提交
docs/                   当前产品计划、状态与接手入口
archive/competition/    已退出主线的比赛材料，只作历史参考
~~~

## 接手

先读 [改造计划](docs/PRODUCT_PLAN.md)、[当前状态](docs/STATUS.md) 与 [架构](web/docs/ARCHITECTURE.md)。后续任务见 [开发交接](web/docs/TEAM_HANDOFF.md)。

本项目不再以比赛训练、评分和官方提交为开发目标。比赛材料已归档；原完整快照为提交 cf3d213。已有存档保持兼容，旧目标在首次连接任务库时导入一次。

许可与素材来源见 [THIRD_PARTY.md](THIRD_PARTY.md) 和 [网页来源清单](web/docs/THIRD_PARTY.md)。保留上游 GPL 及作者声明，说明本项目新增的交互、记忆与任务能力。
