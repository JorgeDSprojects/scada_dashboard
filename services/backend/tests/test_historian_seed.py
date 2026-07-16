import os
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///./historian-seed-test.db")

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
