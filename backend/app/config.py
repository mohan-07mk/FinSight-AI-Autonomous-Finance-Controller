"""
FinSight AI — Application Configuration
"""
import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ── CORS ───────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ── Reconciliation Scoring Weights (must sum to 100) ───────────────────
WEIGHT_VENDOR = 40
WEIGHT_AMOUNT = 30
WEIGHT_DATE = 15
WEIGHT_REFERENCE = 15

# ── Confidence Thresholds ──────────────────────────────────────────────
THRESHOLD_AUTO_RESOLVE = 95     # >=95 → auto-resolve
THRESHOLD_HUMAN_REVIEW = 70     # 70–94 → human approval required
# <70 → manual investigation

# ── Partial Payment ────────────────────────────────────────────────────
PARTIAL_PAYMENT_MAX_PERCENT = 10  # max % diff to consider partial payment

# ── Duplicate Detection ────────────────────────────────────────────────
DUPLICATE_DATE_WINDOW_DAYS = 3
DUPLICATE_AMOUNT_TOLERANCE = 0.01  # 1% tolerance

# ── Date Matching ──────────────────────────────────────────────────────
DATE_EXACT_MATCH_DAYS = 0
DATE_CLOSE_MATCH_DAYS = 3
DATE_PARTIAL_MATCH_DAYS = 7

# ── Firebase / AI Configuration ────────────────────────────────────────
FIREBASE_ENABLED = False
AI_API_ENABLED = os.getenv("AI_API_ENABLED", "False").lower() in ("true", "1", "yes")
AI_MODEL = os.getenv("AI_MODEL", "gemini-2.5-flash")
# FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CRED", "")
# Note: GEMINI_API_KEY is loaded directly in ai_service.py — never exposed here.
