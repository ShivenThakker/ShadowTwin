from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv
load_dotenv()

def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:5173"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    environment: str
    cors_origins: list[str]
    firebase_service_account_json: str | None
    firestore_database_url: str | None
    realtime_db_url: str | None
    gemini_api_key: str | None
    gemini_model: str | None
    google_maps_api_key: str | None
    google_cloud_project: str | None


settings = Settings(
    environment=os.getenv("ENVIRONMENT", "development"),
    cors_origins=_parse_origins(os.getenv("CORS_ORIGINS")),
    firebase_service_account_json=os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"),
    firestore_database_url=os.getenv("FIRESTORE_DATABASE_URL"),
    realtime_db_url=os.getenv("REALTIME_DB_URL"),
    gemini_api_key=os.getenv("GEMINI_API_KEY"),
    gemini_model=os.getenv("GEMINI_MODEL"),
    google_maps_api_key=os.getenv("GOOGLE_MAPS_API_KEY"),
    google_cloud_project=os.getenv("GOOGLE_CLOUD_PROJECT"),
)
