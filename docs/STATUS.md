# 项目状态与接手入口

记录日期：2026-10-22。本文随首次基础代码提交维护。

## 已完成

- 共享输入输出约定、16 类情绪与画像标签校验。
- 假模型、批量处理、命令行与两条自造联调样例。
- 三人分工、需求手册、对话总结、AI 启动指令。
- GitHub Actions 配置，覆盖 Windows 和 Linux 的接口检查。
- 本地 Windows 实际运行：7 项单元测试通过；两条 MOCK 输出生成及字段、数量、ID 校验通过。

本地验证命令：

```bash
python -X utf8 -m unittest discover -s tests -v
python -X utf8 -m emotion_agent mock --input examples/smoke_input.jsonl --output .runtime/mock_predictions.jsonl
python -X utf8 -m emotion_agent validate --input examples/smoke_input.jsonl --predictions .runtime/mock_predictions.jsonl
```

远端自动检查结果见 [GitHub Actions](https://github.com/lkq-guji/emotion-agent/actions)，按对应提交确认成功状态。

## 当前阶段

这是可运行的协作骨架，模型仍为 MOCK。没有真实模型推理、训练、质量分数或正式平台验收结果。官方原始数据、模型权重、运行缓存和密钥不在本次上传范围。

用户已明确授权将本次基础代码和交接文档上传到 `lkq-guji/emotion-agent`。历史总结和 `reference/FACTS_2026-10-22.json` 中“仅有 README、未推送”的描述保留首次上传前的观察，不能用来判断最新远端状态。

## 接下来三个人分别做什么

| 人员 | 下一项可检查的成果 |
|---|---|
| A | 在独立 GPU 环境中加载公开基座，实现真实 `generate(history)`，记录模型许可、显存及生成结果。 |
| B | 将官方验证数据转换成输入与独立标签，检查目标回复、未来轮次和标签不进入输入。 |
| C | 核对官方启动入口与平台约束，整理提交目录和依赖说明，运行基础联调。 |

从 [AI_START_HERE.md](AI_START_HERE.md) 复制指令，让 AI 按 [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) 的 P0 开始。先复查当前环境、精确截止日期和最新代码，再进入真实模型开发。
