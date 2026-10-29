# 素材与开源来源

- 应用聊天、存储和基础组件来自 [RisuAI](https://github.com/kwaroran/Risuai)，固定提交 `f50b5942ec6aa59aa3c56049ac687ca09667fec7`。GPL v3 原文在 `../LICENSE`，保留 Copyright (C) 2024 Kwaroran 及源码内原作者声明；这不是从零编写的独立 MIT 应用。
- [Gato Café](https://github.com/sh3rqxs/gato-cafe) 固定提交 `a06b4d3292df8d8887edfb1f661c4873f0937fc1` 提供交互参考和猫叫；MIT 原文在 `../public/xinyu/audio/GATO-LICENSE.txt`。
- [React Bits](https://github.com/DavidHDev/react-bits) 的交互方向由 Svelte/Canvas/SVG/CSS 独立适配。作者 David Haz，核对许可为 MIT + Commons Clause；记录见 `xinyu/*REFERENCES*.json` 和 `GLASS_SCENERY_REACT_BITS.json`。
- 日记动效参考 StPageFlip（Nodlik，MIT）和 Bits UI Collapsible（MIT），未引入 React 或翻页运行库。来源记录见 `xinyu/DIARY_BOOK_REFERENCE.json` 和 `SCENE_LIBRARY_REFERENCES.json`。
- 像素原设计和初始小岛素材由项目用户提供，新增绘画由 image_gen 生成/编辑。提示词、来源、摘要保留在 `xinyu/*ASSETS*.json`、`ISLAND_ASSET_SOURCES.json`。本地绝对路径已去除；历史记录所述旧素材不一定在当前交付中。
- 固定原创问候的语音参数见 `../public/xinyu/audio/neural/PROVENANCE.json`。当前没有真人克隆，也没有上传聊天用于制作这些固定问候。
- 雨声来自 alxl / Rain on Window Loop 和 Kresiek The Furry / AMB Rain Loop 1，均 CC0；原始链接、处理参数和署名在 `../public/xinyu/audio/rain/`。
- 当前交付不使用旧 LPC 人物，因此不复制其未使用图像、巨量作者表或历史演示页。未移除任何正在使用素材的许可文件。

开发依赖的许可证以各包随附文件为准。队伍仍需补齐用户提供素材可用于比赛展示/再分发的权利证明；生成提示词和工具许可证不等于第三方素材授权证明。
