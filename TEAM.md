# 三人协作约定

## 2026-10-29 桌面应用交接

当前网页在 `web/`，启动与自配 DeepSeek 见 [网页 README](web/README.md)。原模型、数据、评测与官方入口目录均保留。先读 [当前状态](docs/STATUS.md) 和 [下一步验收表](web/docs/TEAM_HANDOFF.md)，不要以早期“只有 MOCK”的描述判断网页当前能力，也不要把网页 API 对话视为正式模型已经完成。

本次已验收的交接快照同步到 `main` / `develop`；后续继续遵守下面的功能分支与 PR 流程。各人只在自己的 `.env.local` 填密钥，不共享队长配置、浏览器存档或应用锁密码。

## 首次上传

由队长把这套基础文件上传一次，另外两人再 clone 同一个仓库。不要各自初始化三个互不相干的项目。

## 两个长期分支

| 分支 | 作用 | 接收什么改动 |
|---|---|---|
| `main` | 正式版本，也是仓库默认分支 | 从 `develop` 合并已测试、已验收的阶段成果。 |
| `develop` | 开发集成和测试 | 接收三位成员功能分支的 Pull Request。 |

流程：`feat/任务名 → develop → 测试与阶段验收 → main`。

本次分支初始化会将协作说明同步到两个分支。之后按上述流程开发与发布。这里记录团队协作约定，尚未启用 GitHub 的强制分支保护规则。

## 第一次下载开发版本

```bash
git clone --branch develop https://github.com/lkq-guji/emotion-agent.git
cd emotion-agent
```

已经下载过仓库的成员，在保存自己的未提交修改后切换：

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
```

`git switch develop` 首次执行时可自动创建跟踪 `origin/develop` 的本地分支。开发环境仍按 README 的三条命令检查。

## 日常开发

- A 从最新 `develop` 建议用 `feat/model` 分支，B 用 `feat/data-eval`，C 用 `feat/demo`；短任务也可以新建更具体的分支。
- 每人开始一个新任务前先更新本地 `develop`，再创建自己的功能分支并修改负责的文件。已有未合并任务保留在原功能分支，按需合入最新 `develop`。
- 完成一个能检查的小任务后提交并提 Pull Request。目标 `base` 选择 `develop`，来源 `compare` 选择自己的 `feat/...`，由另一人查看实际结果，确认自动检查通过后合并。
- 合并后其他成员更新 `develop`。避免三个人同时修改 `contracts.py` 和 `engine.py` 中的接口。
- 确需改接口时，在 Pull Request 中写清楚新字段、调用例子、受影响模块，并同步给另两人。

例如 A 开始第一个模型任务：

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feat/model
```

## 将测试版本发布到 main

1. 负责人核对 `develop` 上准备发布的提交，确认 Windows/Linux 自动检查通过，并完成本阶段实际功能与模型验收。
2. 创建 Pull Request：目标 `base: main`，来源 `compare: develop`，附验证命令、结果和未完成事项。
3. 由另一位成员查看结果；确认该提交可作为阶段正式版本后合并，保持 `main` 最新提交的自动检查通过。
4. 合并后将最新 `main` 同步回 `develop`；若使用 Squash 或 Rebase 合并，也要执行这一步，保持两个长期分支的历史衔接。

```bash
git switch develop
git pull --ff-only origin develop
git fetch origin
git merge origin/main
git push origin develop
```

分支里还有“MOCK”的版本仍是工程骨架。自动检查只验证共享接口，正式模型效果和平台验收需要另外提供真实实验记录。

## 第一个共同验收点

三个人都能运行 README 中的三条命令，并能解释：输入是什么、输出的四个预测字段是什么、id 由谁补回、假模型与真实模型有什么区别。

## 结果记录

在 `docs/experiments/` 中每次新建一个记录，包含提交版本、数据来源、输入划分、模型配置、实际硬件、命令、结果和问题。代码检查通过不等于模型质量提升；MOCK 记录不能写作模型实验或比赛成绩。
