FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV ENVIRONMENT=production
ENV CORS_ORIGINS=https://shadowtwin-16060.web.app,https://shadowtwin-16060.firebaseapp.com

EXPOSE 8080

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]