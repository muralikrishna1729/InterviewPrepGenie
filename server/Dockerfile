# FastAPI app image -- python:3.12-slim base, installs requirements.txt, uvicorn entrypoint
# Multi-stage build: separate build-time deps (compilers, uv itself) from
# the final runtime image, keeping the shipped image smaller.

FROM python:3.13-slim AS builder

WORKDIR /app

# uv installs itself as a static binary -- copy it in rather than pip-installing uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .
RUN uv sync --frozen --no-dev


FROM python:3.13-slim AS runtime

WORKDIR /app

# Runtime-only system deps: none needed for FastAPI itself, but pypdf/python-docx
# are pure-Python, so no extra system packages required here.

COPY --from=builder /app /app

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 5000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
