# 开源参考与来源记录

根目录 Python 基础骨架为本项目编写的接口与联调代码。字段枚举依据用户提供的官方资料；下表仍为模型方向的参考，尚未集成其微调权重。

2026-10-29 新增 `web/` 桌面应用，其聊天/存储基础来自 RisuAI（GPL v3），新增心屿界面、互动与本机网关。原 GPL 文本保留在 [web/LICENSE](web/LICENSE)，上游作者与源码声明保留。网页所用 Gato Café 音频、绘画、雨声及交互参考见 [web/docs/THIRD_PARTY.md](web/docs/THIRD_PARTY.md) 和独立署名页。不要将网页基础代码概括为从零原创或统一 MIT；根目录其他模块的许可范围另行按实际来源维护。

| 参考 | 用途 | 后续复用记录 |
|---|---|---|
| https://github.com/ljy666888/migu-companion | 比赛接口与推理方法参考 | 按实际采用内容补充 |
| https://github.com/scutcyr/SoulChat2.0 | 中文共情回复与训练方法参考 | 按实际采用内容补充 |
| https://github.com/SmartFlowAI/EmoLLM | 微调与评测方法参考 | 按实际采用内容补充 |
| https://github.com/deepseek-ai/deepseek-harness | 可选开发工具 | 当前不是项目运行依赖 |

复用第三方代码时，记录具体模块、固定提交、作者及许可证并保留要求的声明。公开基座模型、赛事数据与团队代码分别登记来源，不把某个基座的许可视为整个仓库的统一许可。项目整体许可证由团队另行确定。
