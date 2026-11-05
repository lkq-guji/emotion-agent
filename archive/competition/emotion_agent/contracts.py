"""开发阶段的严格检查；不替代比赛方的正式评分器或 Schema。"""

EMOTIONS = {
    "joy", "gratitude", "relaxed", "care", "pride", "neutral", "surprise",
    "mixed", "sadness", "loneliness", "anxiety", "anger", "fear", "disgust",
    "shame", "helplessness",
}

PROFILE_LABELS = {
    "personality_traits": {
        "extroverted", "introverted", "open", "conservative", "high_conscientiousness",
        "casual", "agreeable", "assertive", "emotionally_stable", "sensitive",
    },
    "interests": {
        "study_exam", "programming_technology", "reading_writing", "film_animation",
        "music", "games", "sports_fitness", "travel_outdoor", "pets", "social",
        "career_development", "art_design",
    },
    "style": {
        "brief", "detailed", "colloquial", "formal", "direct", "indirect", "humorous",
        "rational", "high_emotional_expression", "low_emotional_expression", "emoji_user",
    },
}

RESULT_FIELDS = {"response_text", "emotion_label", "user_profile", "memory_refs"}


def validate_input(row: dict) -> None:
    if not isinstance(row, dict) or not isinstance(row.get("id"), str):
        raise ValueError("输入必须包含字符串 id")
    history = row.get("history")
    if not isinstance(history, list):
        raise ValueError("输入 history 必须是数组")
    for message in history:
        if not isinstance(message, dict):
            raise ValueError("history 的每条消息必须是对象")
        if message.get("role") not in ("user", "assistant"):
            raise ValueError("消息 role 只能是 user 或 assistant")
        if not isinstance(message.get("content"), str):
            raise ValueError("消息 content 必须是字符串")


def validate_prediction(row: dict, expected_id: str) -> None:
    if not isinstance(row, dict) or set(row) != RESULT_FIELDS | {"id"}:
        raise ValueError("输出必须恰好包含 id 和约定的四个预测字段")
    if row["id"] != expected_id:
        raise ValueError("输出 id 与输入不一致")
    if not isinstance(row["response_text"], str) or not row["response_text"].strip():
        raise ValueError("response_text 必须是非空字符串")
    if not isinstance(row["emotion_label"], str) or row["emotion_label"] not in EMOTIONS:
        raise ValueError("emotion_label 不在 16 类枚举中")
    profile = row["user_profile"]
    if not isinstance(profile, dict) or set(profile) != set(PROFILE_LABELS):
        raise ValueError("user_profile 必须包含约定的三个数组")
    for group, allowed in PROFILE_LABELS.items():
        values = profile[group]
        if not isinstance(values, list) or not all(isinstance(v, str) for v in values):
            raise ValueError(f"{group} 必须是字符串数组")
        if len(values) != len(set(values)) or any(v not in allowed for v in values):
            raise ValueError(f"{group} 存在重复或未允许的标签")
    if row["memory_refs"] != []:
        raise ValueError("当前联调合同要求 memory_refs 为 []")


def validate_batch(inputs: list[dict], predictions: list[dict]) -> None:
    if not inputs:
        raise ValueError("输入不能为空")
    if len(inputs) != len(predictions):
        raise ValueError("预测数量与输入数量不一致")
    ids = []
    for sample, prediction in zip(inputs, predictions):
        validate_input(sample)
        ids.append(sample["id"])
        validate_prediction(prediction, sample["id"])
    if len(ids) != len(set(ids)):
        raise ValueError("输入存在重复 id")
