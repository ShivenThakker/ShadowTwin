from __future__ import annotations

import logging
import os

import firebase_admin
from firebase_admin import credentials, firestore
from firebase_admin import db as realtime_db_module

from config import Settings

# Global references (set during init)
_db = None
_realtime_db = None


def init_firebase(settings: Settings) -> None:
    global _db, _realtime_db
    if firebase_admin._apps:
        _db = firestore.client()
        _realtime_db = realtime_db_module
        logging.info("Firebase already initialized.")
        return

    options: dict[str, str] = {}
    if settings.realtime_db_url:
        options["databaseURL"] = settings.realtime_db_url

    service_account_path = settings.firebase_service_account_json
    if service_account_path and os.path.isfile(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, options or None)
        logging.info("Firebase initialized with service account JSON.")
        _db = firestore.client()
        _realtime_db = realtime_db_module
        return

    try:
        firebase_admin.initialize_app(options=options or None)
        logging.warning(
            "Firebase initialized without explicit service account. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON for full access.",
        )
        _db = firestore.client()
        _realtime_db = realtime_db_module
    except Exception:
        logging.exception("Firebase initialization failed.")
        raise


def get_db():
    """Get the Firestore client, initializing if needed."""
    global _db
    if _db is None:
        if firebase_admin._apps:
            _db = firestore.client()
    return _db


def get_realtime_db():
    """Get the Realtime DB module."""
    global _realtime_db
    if _realtime_db is None:
        if firebase_admin._apps:
            _realtime_db = realtime_db_module
    return _realtime_db


# For backwards compatibility - these are set by init_firebase
db = None
realtime_db = None
