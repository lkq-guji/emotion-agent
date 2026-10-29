# 心屿智伴 · emotion-agent

中文治愈系像素 AI 陪伴项目。**当前桌面应用在 `web/`**，包含小岛首页、进屋对话、情绪日记、授权记忆、画像、成长、衣橱、动态窗景和个人设置。

交接版没有共享密钥、个人聊天或浏览器数据。每位组员自行配置 DeepSeek；不填写密钥也能启动界面和使用本地记录，聊天会提示未配置或调用失败，不以假回复代替。

## 组员先运行当前页面

准备 Node.js 24 LTS 和 pnpm 10.34.1：

```sh
npm install --global pnpm@10.34.1
git clone --branch develop https://github.com/lkq-guji/emotion-agent.git
cd emotion-agent/web
pnpm install --frozen-lockfile
pnpm run doctor
pnpm dev
```

访问 **http://127.0.0.1:5178**。DeepSeek 配置、生产启动和测试说明见 **[web/README.md](web/README.md)**。已有仓库的成员保存修改后更新 develop，再进入 web/。

## 当前两条开发线

| 目录 | 当前状态 | 下一步 |
| --- | --- | --- |
| web/ | Svelte 5 + TypeScript，一个前端；已接真实 Chat API 请求链路，凭据自配 | 接正式模型服务，补质量/性能验收；不是比赛推理入口 |
| emotion_agent/、training/、data_tools/、evaluation/、official/ | 保留三人协作骨架；Python engine 仍是明确标记的 MOCK | 实现正式模型、数据转换、训练评测和官方入口 |

网页当前调用成员配置的外部模型，**尚未调用根目录 Python engine**。网页可用不代表已完成模型训练、正式评分或平台提交。

## 接手资料

- [当前状态与缺口](docs/STATUS.md)
- [网页架构](web/docs/ARCHITECTURE.md) 与 [下一步分工/验收](web/docs/TEAM_HANDOFF.md)
- [三人协作约定](TEAM.md)：feat/... → develop → main
- [比赛需求与约束](docs/PROJECT_REQUIREMENTS.md) 和 [共享接口](docs/INTERFACE.md)
- [AI 接手入口](docs/AI_START_HERE.md)
- [开源与素材来源](THIRD_PARTY.md)

main 保留已验收版本，develop 作为日常集成入口。同步保留原仓库历史和队友目录。没有上传原始比赛数据、模型权重、虚拟环境、node_modules、构建产物、私密配置、截图或运行缓存。

## Python 接口骨架检查

在仓库根目录，用 Python 3.10+ 运行：

```sh
python -X utf8 -m unittest discover -s tests -v
python -X utf8 -m emotion_agent mock --input examples/smoke_input.jsonl --output .runtime/mock_predictions.jsonl
python -X utf8 -m emotion_agent validate --input examples/smoke_input.jsonl --predictions .runtime/mock_predictions.jsonl
```

这些命令只检查共享接口与 MOCK 联调，不评估真实模型质量。官方入口仍以比赛方 start.sh / run_inference.py 及最新规则为准。
