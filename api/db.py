"""Async SQLAlchemy session factory — reads DATABASE_URL from env."""

import os
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Add project root so infra is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from infra.schema import Base  # noqa: E402

_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_default_db = f"sqlite+aiosqlite:///{_project_root}/data/kiyos.db"
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


def _add_missing_columns(sync_conn) -> None:
    """create_all() never alters existing tables; add new nullable columns in place.

    Prototype-only stand-in for migrations so an already-seeded kiyos.db keeps working.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(sync_conn)
    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for col in table.columns:
            if col.name in existing:
                continue
            col_type = col.type.compile(dialect=sync_conn.dialect)
            default = ""
            if col.default is not None and col.default.is_scalar:
                value = col.default.arg
                default = f" DEFAULT {int(value) if isinstance(value, bool) else repr(value)}"
            sync_conn.execute(
                text(f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {col_type}{default}')
            )


async def init_db() -> None:
    """Create all tables if they don't exist, then backfill new columns."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
