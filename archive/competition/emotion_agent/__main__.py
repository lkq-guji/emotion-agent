"""命令行入口：python -m emotion_agent --help。"""

import argparse
import json
import sys
from pathlib import Path

from .contracts import validate_batch
from .engine import MockEngine
from .runner import read_jsonl, run_batch


def main() -> int:
    parser = argparse.ArgumentParser(description="情感陪伴比赛：基础接口联调")
    commands = parser.add_subparsers(dest="command", required=True)
    mock = commands.add_parser("mock", help="运行假模型，检查接口；不能作为比赛结果")
    mock.add_argument("--input", required=True)
    mock.add_argument("--output", required=True)
    check = commands.add_parser("validate", help="仅检查字段、枚举、数量和 ID")
    check.add_argument("--input", required=True)
    check.add_argument("--predictions", required=True)
    args = parser.parse_args()

    try:
        inputs = read_jsonl(args.input)
        if args.command == "mock":
            output = Path(args.output)
            metadata = output.with_suffix(".meta.json")
            if Path(args.input).resolve() in {output.resolve(), metadata.resolve()}:
                raise ValueError("输出或元数据路径不能覆盖输入文件")
            predictions = run_batch(inputs, MockEngine())
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(
                "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in predictions),
                encoding="utf-8",
            )
            metadata.write_text(
                json.dumps({"mode": "mock", "samples": len(predictions), "quality_evaluated": False}, indent=2),
                encoding="utf-8",
            )
            print(f"MOCK 联调完成：{len(predictions)} 条。输出不是比赛预测或模型成绩。")
        else:
            validate_batch(inputs, read_jsonl(args.predictions))
            print("字段与 ID 检查通过；尚未评估情绪、画像、回复质量或推理性能。")
    except (ValueError, OSError) as error:
        print(f"检查失败：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
