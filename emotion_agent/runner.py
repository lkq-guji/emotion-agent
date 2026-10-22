"""共享批处理：保留 ID，校验结果；不在此处训练模型。"""

import json
from pathlib import Path

from .contracts import RESULT_FIELDS, validate_batch, validate_input
from .engine import ModelEngine


def read_jsonl(path: str | Path) -> list[dict]:
    rows = []
    with Path(path).open(encoding="utf-8-sig") as stream:
        for number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"第 {number} 行 JSON 错误：{error.msg}") from error
            if not isinstance(row, dict):
                raise ValueError(f"第 {number} 行必须是 JSON 对象")
            rows.append(row)
    return rows


def run_batch(inputs: list[dict], engine: ModelEngine) -> list[dict]:
    if not inputs:
        raise ValueError("输入不能为空")
    for sample in inputs:
        validate_input(sample)
    if len({sample["id"] for sample in inputs}) != len(inputs):
        raise ValueError("输入存在重复 id")

    predictions = []
    for sample in inputs:
        # 仅传入消息，不把输入 ID 或评测标签混入模型上下文。
        history = [{"role": msg["role"], "content": msg["content"]} for msg in sample["history"]]
        result = engine.generate(history)
        if not isinstance(result, dict) or set(result) != RESULT_FIELDS:
            raise ValueError("模型接口必须返回约定的四个预测字段")
        predictions.append({"id": sample["id"], **result})
    validate_batch(inputs, predictions)
    return predictions
