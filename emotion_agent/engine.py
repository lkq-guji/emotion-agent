"""队员 A 接入真实模型时，实现相同的 generate(history) 接口。"""

from typing import Protocol


class ModelEngine(Protocol):
    def generate(self, history: list[dict]) -> dict:
        """返回四个预测字段。输入 id 由 runner 原样回填。"""
        ...


class MockEngine:
    """只用于三人接口联调，固定值不表示情绪识别或模型能力。"""

    def generate(self, history: list[dict]) -> dict:
        return {
            "response_text": "【MOCK】这是接口联调回复，不是真实模型预测。",
            "emotion_label": "neutral",
            "user_profile": {"personality_traits": [], "interests": [], "style": []},
            "memory_refs": [],
        }
