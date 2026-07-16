from pathlib import Path


def test_compose_declares_required_services():
    text = Path("docker-compose.yml").read_text(encoding="utf-8")
    for service in ("frontend:", "backend:", "simulator:", "postgres:"):
        assert service in text


def test_required_scripts_exist():
    for name in ("up.sh", "down.sh", "restart.sh", "logs.sh", "status.sh"):
        assert Path("scripts", name).exists()


def test_service_dockerfiles_drop_root_user():
    dockerfiles = (
        Path("services/backend/Dockerfile"),
        Path("services/simulator/Dockerfile"),
        Path("services/frontend/Dockerfile"),
    )

    for dockerfile in dockerfiles:
        text = dockerfile.read_text(encoding="utf-8")
        user_lines = [line.strip() for line in text.splitlines() if line.strip().upper().startswith("USER ")]
        assert user_lines, f"{dockerfile} must define a USER instruction"

        effective_user = user_lines[-1].split(maxsplit=1)[1].strip().lower()
        assert effective_user not in {"root", "0", "root:root", "0:0"}, (
            f"{dockerfile} must run as a non-root user"
        )
