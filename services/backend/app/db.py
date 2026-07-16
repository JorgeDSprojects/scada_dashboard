import os
from collections.abc import Generator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, declarative_base, sessionmaker


def _build_database_url() -> str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    required = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
    env_values = {key: os.getenv(key) for key in required}
    missing = [key for key, value in env_values.items() if not value]
    if missing:
        raise RuntimeError(
            "Missing required PostgreSQL environment variables: " + ", ".join(missing)
        )

    return (
        "postgresql+psycopg2://"
        f"{env_values['DB_USER']}:{env_values['DB_PASSWORD']}"
        f"@{env_values['DB_HOST']}:{env_values['DB_PORT']}/{env_values['DB_NAME']}"
    )


DATABASE_URL = _build_database_url()
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _ensure_sqlite_timestamp_columns() -> None:
    sqlite_fallback = "'1970-01-01 00:00:00+00:00'"
    statements = (
        (
            "dashboards",
            "created_at",
            f"ALTER TABLE dashboards ADD COLUMN created_at DATETIME NOT NULL DEFAULT {sqlite_fallback}",
        ),
        (
            "dashboards",
            "updated_at",
            f"ALTER TABLE dashboards ADD COLUMN updated_at DATETIME NOT NULL DEFAULT {sqlite_fallback}",
        ),
        (
            "widgets",
            "created_at",
            f"ALTER TABLE widgets ADD COLUMN created_at DATETIME NOT NULL DEFAULT {sqlite_fallback}",
        ),
        (
            "widgets",
            "updated_at",
            f"ALTER TABLE widgets ADD COLUMN updated_at DATETIME NOT NULL DEFAULT {sqlite_fallback}",
        ),
    )

    with engine.begin() as connection:
        for table_name, column_name, statement in statements:
            table_exists = inspect(connection).has_table(table_name)
            if not table_exists:
                continue

            existing_columns = {column["name"] for column in inspect(connection).get_columns(table_name)}
            if column_name not in existing_columns:
                connection.exec_driver_sql(statement)


def run_startup_compat_migrations() -> None:
    dialect = engine.dialect.name
    if dialect == "postgresql":
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE IF EXISTS dashboards "
                "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            )
            connection.exec_driver_sql(
                "ALTER TABLE IF EXISTS dashboards "
                "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            )
            connection.exec_driver_sql(
                "ALTER TABLE IF EXISTS widgets "
                "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            )
            connection.exec_driver_sql(
                "ALTER TABLE IF EXISTS widgets "
                "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            )
        return

    if dialect == "sqlite":
        _ensure_sqlite_timestamp_columns()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
