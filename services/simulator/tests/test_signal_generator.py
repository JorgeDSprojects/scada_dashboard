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


def test_generator_uses_waveform_values_for_supported_shapes():
    gen = SignalGenerator(
        {
            "sin": {"min": 0, "max": 10, "waveform": "sine", "waveform_step": 1.5707963267948966},
            "cos": {"min": 0, "max": 10, "waveform": "cosine", "waveform_step": 1.5707963267948966},
            "tri": {"min": 0, "max": 10, "waveform": "triangular", "waveform_step": 1.5707963267948966},
            "square": {"min": 0, "max": 10, "waveform": "square", "waveform_step": 3.141592653589793},
            "pulse": {"min": 0, "max": 10, "waveform": "pulse", "waveform_step": 1.5707963267948966},
        }
    )

    assert gen.next_value("sin") == 5.0
    assert gen.next_value("sin") == 10.0

    assert gen.next_value("cos") == 10.0
    assert gen.next_value("cos") == 5.0

    assert gen.next_value("tri") == 0.0
    assert gen.next_value("tri") == 5.0

    assert gen.next_value("square") == 10.0
    assert gen.next_value("square") == 10.0

    assert gen.next_value("pulse") == 10.0
    assert gen.next_value("pulse") == 0.0
