"""
FinSight AI — Data Normalizers
Normalize vendor names, dates, currency strings, references.
"""
from __future__ import annotations
import re
import unicodedata
from datetime import datetime, date
from typing import Optional
from dateutil import parser as dateparser


# ── Vendor Name Normalization ──────────────────────────────────────────

_VENDOR_STRIP = re.compile(
    r"\b(pvt|private|ltd|limited|llp|inc|corp|corporation|co|company|"
    r"plc|llc|enterprises|solutions|services|group|intl|international)\b",
    re.IGNORECASE,
)
_MULTI_SPACE = re.compile(r"\s+")


def normalize_vendor(name: str) -> str:
    """
    Normalize a vendor name for comparison.
    'ABC Technologies Pvt. Ltd.' → 'abc technologies'
    """
    if not name:
        return ""
    s = name.strip()
    s = unicodedata.normalize("NFKD", s)
    s = s.lower()
    s = s.replace(".", " ").replace(",", " ").replace("-", " ")
    s = _VENDOR_STRIP.sub("", s)
    s = _MULTI_SPACE.sub(" ", s).strip()
    return s


# ── Date Normalization ─────────────────────────────────────────────────

_DATE_FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d %b %Y",
    "%d %B %Y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%Y/%m/%d",
]


def parse_date(value: str) -> Optional[date]:
    """Try multiple date formats, return date or None."""
    if not value or not value.strip():
        return None
    v = value.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    try:
        return dateparser.parse(v).date()
    except Exception:
        return None


def normalize_date(value: str) -> str:
    """Return ISO-format date string or original."""
    d = parse_date(value)
    return d.isoformat() if d else value


# ── Currency / Amount Normalization ────────────────────────────────────

_CURRENCY_CHARS = re.compile(r"[₹$€£,\s]")


def normalize_amount(value) -> Optional[float]:
    """
    '₹ 10,500.00' → 10500.0
    '10500' → 10500.0
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return None
    s = _CURRENCY_CHARS.sub("", s)
    s = s.replace("(", "-").replace(")", "")
    try:
        return float(s)
    except ValueError:
        return None


# ── Reference Normalization ────────────────────────────────────────────

_REF_STRIP = re.compile(r"[^a-z0-9]")


def normalize_reference(ref: str) -> str:
    """Normalize reference/invoice numbers for comparison."""
    if not ref:
        return ""
    return _REF_STRIP.sub("", ref.lower())
