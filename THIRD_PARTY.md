# 来源与许可

当前产品主线位于 web/，保留原 RisuAI 聊天与存储基础，许可原文为 [web/LICENSE](web/LICENSE)（GPL v3）。本项目新增像素界面、授权记忆、任务工具、确认交互与本机调度；保留上游作者、版权和许可声明。

像素图像、音频、React Bits 交互参考与移植来源，见 [web/docs/THIRD_PARTY.md](web/docs/THIRD_PARTY.md) 及 web/docs/xinyu/ 的来源记录。产品页面可使用心屿品牌，开源来源仍须如实保留。

本机任务通过 Node 内置 SQLite 保存，LangGraph.js 使用官方 SQLite checkpointer 持久化待确认流程。依赖许可见各包随附文件。
