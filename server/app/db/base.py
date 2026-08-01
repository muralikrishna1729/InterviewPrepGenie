from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.SQL_DEBUG,  # full SQL echo only when SQL_DEBUG=true
    pool_pre_ping=True,
)

logger.debug("Database engine created (environment=%s)", settings.ENVIRONMENT)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            logger.exception("Database session error")
            await session.rollback()
            raise


@asynccontextmanager
async def celery_session() -> AsyncIterator[AsyncSession]:
    """
    Fresh engine + session for Celery tasks that use asyncio.run().

    The module-level `engine` is bound to uvicorn's event loop. Reusing it
    inside Celery's short-lived loops breaks on Windows (Proactor + closed
    transport). Create and dispose a dedicated engine per task instead.
    """
    task_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=1,
        max_overflow=0,
    )
    session_factory = async_sessionmaker(
        bind=task_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    try:
        async with session_factory() as session:
            yield session
    finally:
        await task_engine.dispose()
