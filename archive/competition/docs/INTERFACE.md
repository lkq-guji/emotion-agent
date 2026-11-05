# 团队共享接口

## 1. 输入

```json
{"id":"demo_001","history":[{"role":"user","content":"虚构示例：我明天要考试。"}]}
```

输入 `id` 原样保留；消息角色只使用 `user`、`assistant`。数据转换时，每个预测点只保留截至目标用户发言的历史，目标 Assistant 回复和未来轮次进入独立标签文件。

## 2. A 的模型接口

```python
class MyEngine:
    def generate(self, history: list[dict]) -> dict:
        # 在此调用真实模型，解析并返回以下四个字段。
        return {
            "response_text": "实际生成的中文回复",
            "emotion_label": "anxiety",
            "user_profile": {
                "personality_traits": [],
                "interests": [],
                "style": []
            },
            "memory_refs": []
        }
```

上例只说明结构，不是真实模型实现。输入不含参考答案，模型返回对象也不含 id。

## 3. B 的批处理接口

```python
from emotion_agent.runner import run_batch

predictions = run_batch(samples, my_engine)
```

runner 为每条结果补上原始 id，输出恰好五个顶层字段。C 的演示程序使用相同预测字段；网页专有状态保存在另一个对象中，避免加入提交 JSON。

## 4. 开发检查的范围

`contracts.py` 检查 16 类情绪、三组画像枚举、无重复标签、非空回复，以及当前 `memory_refs=[]` 约定。它不是官方评分器，不计算准确率、BLEU、ROUGE、BERTScore 或正式性能分数。

本地官方包存在两个已知差异：原 Schema 的情绪枚举允许空字符串，但开发检查将其视为失败；原 Schema 的 ID 正则与公开样例 ID 形式不同，因此开发检查只要求 ID 是字符串、唯一且原样回填。**官方原文件不因此改变**，正式提交时仍需核实主办方最终口径。

## 5. 当前 MOCK

MockEngine 固定返回 neutral 和空画像，回复含 `【MOCK】`。它只帮助 B/C 在真实模型接入前开发，不能用于质量评测或比赛提交。CLI 会额外保存 `.meta.json` 标记，禁止把其结果当作真实模型输出。
