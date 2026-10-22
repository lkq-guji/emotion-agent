import json
import subprocess
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from emotion_agent.contracts import validate_batch, validate_prediction
from emotion_agent.engine import MockEngine
from emotion_agent.runner import run_batch


def sample(sample_id="test1_000001_t5"):
    return {"id": sample_id, "history": [{"role": "user", "content": "虚构样例"}]}


class ContractTests(unittest.TestCase):
    def test_original_id_and_exact_fields_are_preserved(self):
        prediction = run_batch([sample()], MockEngine())[0]
        self.assertEqual(prediction["id"], "test1_000001_t5")
        self.assertEqual(set(prediction), {"id", "response_text", "emotion_label", "user_profile", "memory_refs"})

    def test_duplicate_ids_are_rejected_before_generation(self):
        class NeverRun:
            def generate(self, history):
                raise AssertionError("重复 ID 时不应调用模型")

        with self.assertRaisesRegex(ValueError, "重复"):
            run_batch([sample(), sample()], NeverRun())

    def test_invalid_predictions_are_rejected(self):
        valid = run_batch([sample()], MockEngine())[0]
        invalid = []
        row = deepcopy(valid)
        row["emotion_label"] = "焦虑"
        invalid.append(row)
        row = deepcopy(valid)
        row["user_profile"]["style"] = ["brief", "brief"]
        invalid.append(row)
        row = deepcopy(valid)
        row["user_profile"]["personality_traits"] = ["unknown"]
        invalid.append(row)
        row = deepcopy(valid)
        row["memory_refs"] = ["mem_000001"]
        invalid.append(row)
        row = deepcopy(valid)
        row["debug"] = "extra"
        invalid.append(row)
        for prediction in invalid:
            with self.subTest(prediction=prediction):
                with self.assertRaises(ValueError):
                    validate_prediction(prediction, sample()["id"])

    def test_output_order_and_count_are_checked(self):
        inputs = [sample("first"), sample("second")]
        predictions = run_batch(inputs, MockEngine())
        with self.assertRaises(ValueError):
            validate_batch(inputs, list(reversed(predictions)))
        with self.assertRaises(ValueError):
            validate_batch(inputs, predictions[:1])

    def test_reference_fields_are_not_passed_to_engine(self):
        class InspectEngine:
            received = None

            def generate(self, history):
                self.received = history
                return MockEngine().generate(history)

        engine = InspectEngine()
        row = sample()
        row["target"] = {"response_text": "不得传入模型的参考答案"}
        run_batch([row], engine)
        self.assertEqual(engine.received, row["history"])
        self.assertNotIn("参考答案", json.dumps(engine.received, ensure_ascii=False))

    def test_mock_cli_creates_explicit_mock_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "input.jsonl"
            output = Path(folder) / "mock_predictions.jsonl"
            source.write_text(json.dumps(sample(), ensure_ascii=False) + "\n", encoding="utf-8")
            result = subprocess.run(
                [sys.executable, "-X", "utf8", "-m", "emotion_agent", "mock", "--input", str(source), "--output", str(output)],
                capture_output=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            metadata = json.loads(output.with_suffix(".meta.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata, {"mode": "mock", "samples": 1, "quality_evaluated": False})
            self.assertEqual(json.loads(output.read_text(encoding="utf-8"))["id"], sample()["id"])

    def test_cli_never_overwrites_input_via_output_or_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "mock.meta.json"
            original = json.dumps(sample(), ensure_ascii=False) + "\n"
            source.write_text(original, encoding="utf-8")
            for output in [source, Path(folder) / "mock.jsonl"]:
                with self.subTest(output=output):
                    result = subprocess.run(
                        [sys.executable, "-X", "utf8", "-m", "emotion_agent", "mock", "--input", str(source), "--output", str(output)],
                        capture_output=True,
                    )
                    self.assertEqual(result.returncode, 1)
                    self.assertEqual(source.read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
