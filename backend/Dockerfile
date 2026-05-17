# Heimdall backend.
#
# Build context expected at the repo root: `docker build -f backend/Dockerfile .`
# (the compose file in the repo root sets context: . and dockerfile: backend/Dockerfile).

FROM python:3.12-slim

WORKDIR /app

# Install deps first so Docker can cache the layer.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application code.
COPY backend       /app/backend
COPY verticals     /app/verticals
COPY policies      /app/policies
COPY scripts       /app/scripts
COPY cli           /app/cli
COPY pyproject.toml /app/pyproject.toml

# Install the package so the `heimdall` console script lands in PATH.
RUN pip install --no-cache-dir -e .

# SQLite lives on a mounted volume so it survives container restarts.
RUN mkdir -p /app/data
ENV HEIMDALL_DB_PATH=/app/data/heimdall.db

ENV PYTHONPATH=/app
ENV HEIMDALL_ALLOWED_ORIGINS=http://localhost:3000

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
