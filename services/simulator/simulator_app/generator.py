import json
import math
import random
from pathlib import Path


class SignalGenerator:
    def __init__(self, spec: dict[str, dict]):
        self.spec = spec
        self._phase_by_signal: dict[str, float] = {name: 0.0 for name in spec}

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
        low = float(cfg["min"])
        high = float(cfg["max"])
        phase = self._phase_by_signal.get(signal_name, 0.0)
        step = float(cfg.get("waveform_step", math.pi / 12))
        self._phase_by_signal[signal_name] = phase + step

        waveform = str(cfg.get("waveform", "")).strip().lower()
        normalized = _normalized_waveform_value(waveform, phase)
        if normalized is None:
            return round(random.uniform(low, high), 3)

        scaled = low + ((normalized + 1) / 2) * (high - low)
        return round(scaled, 3)


def _normalized_waveform_value(waveform: str, phase: float) -> float | None:
    position = (phase / (2 * math.pi)) % 1

    if waveform == "sine":
        return math.sin(phase)
    if waveform == "cosine":
        return math.cos(phase)
    if waveform == "triangular":
        return 1 - 4 * abs(position - 0.5)
    if waveform == "pulse":
        return 1.0 if position < 0.2 else -1.0
    if waveform == "square":
        return 1.0 if math.sin(phase) >= 0 else -1.0

    return None
