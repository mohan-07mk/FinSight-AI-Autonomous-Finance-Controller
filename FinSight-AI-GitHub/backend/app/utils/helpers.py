"""
FinSight AI — Helpers
Timestamp generation, ID generation, etc.
"""
from __future__ import annotations
from datetime import datetime, timezone


def utc_now() -> str:
    """ISO-format UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    """Today's date as ISO string."""
    return datetime.now(timezone.utc).date().isoformat()
