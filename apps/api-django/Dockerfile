FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock requirements.txt ./
RUN python -m pip install --upgrade pip \
    && python -m pip install uv \
    && uv sync --frozen --no-dev

COPY apps/api-django ./apps/api-django
COPY docker/api/entrypoint.sh ./docker/api/entrypoint.sh

RUN chmod +x ./docker/api/entrypoint.sh

WORKDIR /app/apps/api-django
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

ENTRYPOINT ["/app/docker/api/entrypoint.sh"]
CMD ["uvicorn", "sightline_api.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
