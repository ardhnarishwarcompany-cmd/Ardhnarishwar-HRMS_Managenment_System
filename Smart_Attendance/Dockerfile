# ══════════════════════════════════════════════════════════════════════════════
#  ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM — DOCKERFILE (PRODUCTION)
# ══════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim

# Environment settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    HOST=0.0.0.0 \
    PYTHONPATH=/app

# System dependencies for OpenCV headless, network diagnostics, and SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy complete project codebase
COPY . .

# Expose standard production port
EXPOSE 5000

# Container healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Launch using production WSGI server
CMD ["sh", "-c", "gunicorn wsgi:application --bind 0.0.0.0:${PORT:-5000} --workers 4 --threads 2 --timeout 120"]
