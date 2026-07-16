import json
import random
from pathlib import Path


class SignalGenerator:
    def __init__(self, spec: dict[str, dict]):
        self.spec = spec

    @classmethod
    def from_file(cls, path: str) -> "SignalGenerator":
        resolved_path = cls._resolve_path(path)
        payload = json.loads(resolved_path.read_text(encoding="utf-8"))
        return cls({item["name"]: item for item in payload["signals"]})

    @staticmethod
    def _resolve_path(path: str) -> Path:
        candidate = Path(path)
        if candidate.exists():
            return candidate

        service_root = Path(__file__).resolve().parents[1]
        fallback = service_root / path
        if fallback.exists():
            return fallback

        raise FileNotFoundError(f"Signal catalog not found: {path}")

    def next_value(self, signal_name: str) -> float:
        cfg = self.spec[signal_name]
        return round(random.uniform(cfg["min"], cfg["max"]), 3)
