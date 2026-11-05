# 第一次上传到 GitHub

适用仓库：https://github.com/lkq-guji/emotion-agent

如果仓库已包含本代码，请直接 clone 后按 README 运行；下面保留首次手工上传的方法。最近状态见 [docs/STATUS.md](docs/STATUS.md)。

文档生成时仓库已有 README.md。上传前先读当前内容并整合，不依据旧的“空仓库”描述覆盖用户或队友的新文件。

## 网页方式

1. 解压基础代码包，进入 `emotion-agent` 文件夹。
2. 打开仓库。空仓库可点击 `uploading an existing file`；已有文件时用 `Add file → Upload files`。
3. 把本文件所在目录的内容上传。让 README.md、emotion_agent/、.github/ 直接位于仓库根目录，避免多套一层文件夹。检查 `.gitignore` 与 `.github/` 也上传了。
4. 提交说明填写 `Initialize team starter and shared model contract`，点击提交。
5. 在 `Settings → Collaborators` 邀请另外两位成员。待三人都有访问权限后，各自 clone 并在独立分支开发。

上传后，让 AI 从 docs/AI_START_HERE.md 和 docs/PROJECT_REQUIREMENTS.md 接手。docs/CONVERSATION_SUMMARY.md 是历史背景，不是当前远端状态或已运行结果的替代品。

## 上传后的共同检查

- 仓库首页能看到 README 和三人分工。
- Actions 中的 `Shared interface checks` 实际通过。这个自动检查只运行假模型和接口测试，不训练模型。
- 三个人都按 README 成功运行本地联调命令。

基础代码包中的 `.runtime/`、缓存和真实数据不参与首次上传；压缩包也已排除这些文件。代码包准备完成不等于已经推送到 GitHub。
