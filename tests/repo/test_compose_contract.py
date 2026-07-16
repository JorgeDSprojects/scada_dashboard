from pathlib import Path


def test_compose_declares_required_services():
    text = Path("docker-compose.yml").read_text(encoding="utf-8")
    for service in ("frontend:", "backend:", "simulator:", "postgres:"):
        assert service in text


def test_required_scripts_exist():
    for name in ("up.sh", "down.sh", "restart.sh", "logs.sh", "status.sh"):
        assert Path("scripts", name).exists()
