# 官方入口接入

比赛方的 run_inference.py、start.sh、配置和 Schema 是正式接口依据。本模板只提供接入说明，不改写官方入口。

由 B 整理本机官方包来源与版本，并在确认赛事材料可公开的范围后保存必要的小文件快照；训练/验证原始数据、完整压缩包和模型权重保存在本机，不直接放入 Git。

目标仍是通过主办方指定命令：

```bash
bash /root/participant/start.sh TEST_FILE RESULT_DIR
```

正式生成 submission.jsonl 与 performance_report.json。当前 `python -m emotion_agent mock` 只是接口联调程序，不能替代该验收。
