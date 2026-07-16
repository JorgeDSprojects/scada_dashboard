import os
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

DB_FILE = Path(tempfile.gettempdir()) / f"scada_backend_test_{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"

from app.historian import seed


def test_catalog_candidates_builder_handles_shallow_paths() -> None:
    candidates = seed._catalog_candidates_from_seed_path(Path("seed.py"))
    assert candidates


def test_catalog_candidates_builder_includes_renamed_simulator_catalog_path(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    seed_path = repo_root / "services" / "backend" / "app" / "historian" / "seed.py"
    expected = repo_root / "services" / "simulator" / "simulator_app" / "config" / "signals.json"

    candidates = seed._catalog_candidates_from_seed_path(seed_path)
    assert expected in candidates


class _FakeDialect:
    name = "sqlite"


class _FakeBind:
    dialect = _FakeDialect()


class _FakeSession:
    bind = _FakeBind()


def test_sample_interval_defaults_to_catalog_frequency_without_floor(monkeypatch) -> None:
    monkeypatch.delenv("HISTORIAN_MIN_SAMPLE_SECONDS", raising=False)

    signal = {"frequency_seconds": 0.5}
    interval = seed._sample_interval_seconds(signal, _FakeSession())

    assert interval == 0.5


def test_sample_interval_applies_explicit_override_floor(monkeypatch) -> None:
    monkeypatch.setenv("HISTORIAN_MIN_SAMPLE_SECONDS", "120")

    signal = {"frequency_seconds": 5}
    interval = seed._sample_interval_seconds(signal, _FakeSession())

    assert interval == 120
