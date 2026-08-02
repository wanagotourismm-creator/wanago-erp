# Python port of src/lib/firebase/admin.ts's getAdminDb() — same lazy
# singleton, same credential (FIREBASE_SERVICE_ACCOUNT_KEY, the full service
# account JSON as a single-line string), never raises: callers get None and
# degrade gracefully, exactly like the TS side does.
import json
import os
import threading
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore

_APP_NAME = "wanago-ai-employee"
_lock = threading.Lock()
_app: Optional[firebase_admin.App] = None


def get_admin_app() -> Optional["firebase_admin.App"]:
    global _app
    if _app is not None:
        return _app
    with _lock:
        if _app is not None:
            return _app
        try:
            _app = firebase_admin.get_app(_APP_NAME)
            return _app
        except ValueError:
            pass
        raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        if not raw:
            return None
        try:
            cred = credentials.Certificate(json.loads(raw))
            _app = firebase_admin.initialize_app(cred, name=_APP_NAME)
            return _app
        except Exception:
            return None


def get_db():
    app = get_admin_app()
    return firestore.client(app) if app else None
