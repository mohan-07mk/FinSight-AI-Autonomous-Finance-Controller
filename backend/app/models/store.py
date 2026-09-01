"""
FinSight AI — In-Memory Data Store
Temporary local persistence (will be replaced by Firebase).
"""
from __future__ import annotations
import threading
from typing import Dict, List, Any

_lock = threading.Lock()

# ── Primary stores ─────────────────────────────────────────────────────
bank_transactions: Dict[str, dict] = {}       # keyed by transaction_id
invoices: Dict[str, dict] = {}                # keyed by invoice_id
ledger_entries: Dict[str, dict] = {}          # keyed by ledger_id

# ── Reconciliation results ─────────────────────────────────────────────
reconciliation_results: Dict[str, dict] = {}  # keyed by transaction_id

# ── Exceptions ─────────────────────────────────────────────────────────
exceptions: Dict[str, dict] = {}              # keyed by exception_id

# ── Audit trail (append-only list) ─────────────────────────────────────
audit_log: List[dict] = []

# ── Insights ───────────────────────────────────────────────────────────
insights: List[dict] = []

# ── Counters ───────────────────────────────────────────────────────────
_counters: Dict[str, int] = {
    "exception": 0,
    "audit": 0,
    "insight": 0,
}


def next_id(prefix: str) -> str:
    """Thread-safe incremental ID generator."""
    with _lock:
        _counters[prefix] = _counters.get(prefix, 0) + 1
        return f"{prefix.upper()}-{_counters[prefix]:04d}"


def clear_all():
    """Reset all stores (for testing)."""
    with _lock:
        bank_transactions.clear()
        invoices.clear()
        ledger_entries.clear()
        reconciliation_results.clear()
        exceptions.clear()
        audit_log.clear()
        insights.clear()
        for k in _counters:
            _counters[k] = 0
