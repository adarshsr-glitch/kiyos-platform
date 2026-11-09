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


async def init_db() -> None:
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
