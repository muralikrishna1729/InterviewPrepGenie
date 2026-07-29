"""
FastAPI app entrypoint.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.logging import get_logger
from app.modules.auth.router import router as auth_router
from app.modules.interview.router import router as interview_router
from app.websocket.router import router as websocket_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application starting (environment=%s)", settings.ENVIRONMENT)
    yield
    logger.info("Application shutting down")


app = FastAPI(title="InterviewPrepGenie API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # lets update once frontend is ready,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(interview_router)
app.include_router(websocket_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
