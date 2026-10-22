# emotion-agent

三人协作开发“数字人综合情感陪伴对话模型”的初始骨架。

**当前状态：仅完成共享接口与 MOCK 联调。未接入真实模型、未训练、未获得比赛分数。**

最近的验证结果和下一步任务见 [项目状态](docs/STATUS.md)。

## 交给 AI 接手

1. 先读 [AI 启动指令](docs/AI_START_HERE.md)，复制总控或 A/B/C 的提示词。
2. 以 [项目需求与逐步执行手册](docs/PROJECT_REQUIREMENTS.md) 为工作入口。
3. [完整对话总结](docs/CONVERSATION_SUMMARY.md) 保留讨论背景、决定、实际成果与尚未完成事项。

需求手册已按三人团队、用户当时剩余 18 天、RTX 4060 Laptop 约 8GB 显存安排阶段。接手时重新检查仓库、环境和精确截止日期，保留队友后续工作。

## 每个人第一次拉取后做什么

安装 Python 3.10+，在项目根目录执行（基础联调不需要 GPU 和第三方依赖）：

```bash
python -X utf8 -m emotion_agent mock --input examples/smoke_input.jsonl --output .runtime/mock_predictions.jsonl
python -X utf8 -m emotion_agent validate --input examples/smoke_input.jsonl --predictions .runtime/mock_predictions.jsonl
python -X utf8 -m unittest discover -s tests -v
```

第一条生成两条固定的假回复，以及明确标记 `mode=mock` 的元数据。后两条只检查程序接口与输出格式，**不评估模型能力**。`examples/` 是自造样例，不是比赛数据。`-X utf8` 用于统一 Windows/Linux 的中文输出编码。

## 三人分工

| 人员 | 负责什么 | 主要目录 |
|---|---|---|
| A | 基座模型、训练、真实模型接口 | `training/`、`emotion_agent/engine.py` |
| B | 数据转换、批量推理、评测和校验 | `data_tools/`、`evaluation/`、`emotion_agent/runner.py` |
| C | 正式入口、平台验收、演示、文档与报告整理 | `official/`、`demo/`、`docs/`、`.github/` |

每个人记录自己实际做的实验；具体协作方法见 [TEAM.md](TEAM.md)。

## 先约定好接口

模型模块提供 `generate(history) -> dict`：输入历史消息，返回 `response_text`、`emotion_label`、`user_profile`、`memory_refs` 四个字段。批处理模块负责把输入 `id` 原样补回，并检查结果。

字段、调用例子、正式要求与开发检查的差异见 [接口说明](docs/INTERFACE.md)。所有人先按此接口开发，A 后续用真实模型替换 MockEngine，B 与 C 可以继续使用相同字段。

## 第一批文件

```text
emotion_agent/     共享接口、假模型、批处理和命令行
examples/          自造接口样例
tests/             共享接口检查
training/          A 后续添加训练配置、训练脚本
data_tools/        B 后续添加官方数据转换
evaluation/        B 后续添加真实质量与延迟评测
demo/              C 后续添加聊天演示
official/          官方入口接入说明
docs/             接口、阶段任务和实验记录模板
.github/          自动检查和 Pull Request 模板
```

数据、权重、虚拟环境、密钥和大部分生成结果已列入 `.gitignore`。把需要保留的小型实验汇总放进 `docs/experiments/`，不要依赖被忽略的运行目录作为唯一记录。

## 接下来完成的三个任务

1. A：在独立 CUDA 环境中加载许可明确的公开基座，实现真实 `generate(history)`。
2. B：把官方验证集的预测点转换成输入和独立标签，保证目标回复及未来轮次不进入历史，再建立基线评测。
3. C：整理正式入口和平台接入说明，用假模型联调展示；核心流程稳定后完善真实演示和交付材料。

最终仍须通过比赛方的统一入口和正式环境验收。本骨架 CLI 不是正式 `start.sh` 的替代品。
