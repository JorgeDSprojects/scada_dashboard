import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from simulator_app.generator import SignalGenerator


def test_generator_respects_min_max():
    gen = SignalGenerator.from_file("simulator_app/config/signals.json")
    sample = gen.next_value("Gen_RPM")
    assert 0 <= sample <= 2000
