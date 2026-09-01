# FinSight AI — Autonomous Finance Controller Backend

Production-quality FastAPI backend for **FinSight AI**, an AI-powered financial operations platform that helps finance teams reconcile data from bank statements, invoices, and ERP/ledger systems, detect exceptions, and manage human-in-the-loop approvals.

---

## 🏗️ Architecture Overview

The backend is built with Python 3.12+, FastAPI, Pydantic v2, and Pandas. It follows a clean, modular architecture:

```
backend/
├── app/
│   ├── main.py                  # FastAPI app entry point & CORS configuration
│   ├── config.py                # Environment configs, scoring weights, thresholds
│   │
│   ├── api/                     # REST API Route Handlers
│   │   ├── routes_upload.py         # File ingestion (Bank, Invoice, Ledger)
│   │   ├── routes_reconciliation.py # 3-Way Reconciliation engine trigger & results
│   │   ├── routes_exceptions.py     # Exception query, Approve, Reject, Escalate
│   │   └── routes_dashboard.py      # Overview metrics, Insights, Forecast, Audit
│   │
│   ├── models/                  # Storage Layer
│   │   └── store.py                 # Thread-safe local store (swappable for Firebase)
│   │
│   ├── schemas/                 # Pydantic Schemas & DTOs
│   │   └── schemas.py               # Request/Response models and Enums
│   │
│   ├── services/                # Core Business Logic
│   │   ├── file_processor.py        # File validation, column mapping & normalization
│   │   ├── reconciliation_service.py# Fuzzy logic matching & scoring engine
│   │   ├── exception_service.py     # Rule-based exception & duplicate detection
│   │   ├── approval_service.py      # Human approval, reject & escalation logic
│   │   ├── audit_service.py         # Immutable append-only audit trail
│   │   ├── dashboard_service.py     # Dynamic Finance Control Score & KPIs
│   │   ├── insight_service.py       # Pattern recognition & root cause analysis
│   │   └── forecast_service.py      # 30-day cash flow projection engine
│   │
│   ├── utils/                   # Helpers & Utilities
│   │   ├── normalizers.py           # Vendor fuzzy normalization, dates, currency
│   │   ├── validators.py            # Column mappings & structural checks
│   │   └── helpers.py               # ISO timestamps & utilities
│   │
│   └── data/                    # Sample Test Datasets
│       ├── sample_bank.csv
│       ├── sample_invoices.csv
│       └── sample_ledger.csv
│
├── requirements.txt             # Dependency definitions
├── test_backend.py              # Automated test suite (11 test scenarios)
└── README.md                    # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run Automated Test Suite

```bash
python test_backend.py
```

### 3. Start Server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API Base**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 📡 REST API Reference

All responses follow a standard envelope format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### 1. Ingestion / Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload/bank` | Upload bank statement (`.csv`, `.xlsx`) |
| `POST` | `/api/upload/invoices` | Upload invoice batch (`.csv`, `.xlsx`) |
| `POST` | `/api/upload/ledger` | Upload ERP/ledger export (`.csv`, `.xlsx`) |

### 2. Reconciliation Engine

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reconciliation/run` | Execute 3-way matching across uploaded data |
| `GET`  | `/api/reconciliation/results` | Fetch all transaction match scores and details |
| `GET`  | `/api/reconciliation/{transaction_id}` | Fetch match breakdown for a specific transaction |

### 3. Exception & Approval Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/exceptions` | Fetch all detected exceptions (supports `risk` and `status` query filters) |
| `GET`  | `/api/exceptions/{exception_id}` | Fetch exception detail |
| `POST` | `/api/exceptions/{exception_id}/approve` | Approve AI recommendation |
| `POST` | `/api/exceptions/{exception_id}/reject` | Reject AI recommendation |
| `POST` | `/api/exceptions/{exception_id}/escalate` | Escalate for manual review |

### 4. Dashboard, Insights & Forecast

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/dashboard/overview` | Fetch Overview Dashboard KPIs & Control Score |
| `GET`  | `/api/insights` | Fetch rule-based root cause analysis & pattern insights |
| `GET`  | `/api/forecast` | Fetch 30-day cash flow forecast & risk alerts |
| `GET`  | `/api/audit` | Fetch append-only audit log (newest first) |
| `GET`  | `/api/audit/{audit_id}` | Fetch specific audit record |

---

## 📊 Reconciliation Scoring & Confidence Policy

### Match Factors & Weights (Total = 100 points)

$$\text{Confidence Score} = (V \times 0.40) + (A \times 0.30) + (D \times 0.15) + (R \times 0.15)$$

1. **Vendor Similarity ($V$, 40%)**: RapidFuzz token-sort ratio on normalized vendor names (strips Pvt/Ltd/Inc, punctuation, lowercase).
2. **Amount Similarity ($A$, 30%)**: Percentage delta comparison. $0\%$ diff $= 100$; $\le 0.1\% = 99$; $\le 1\% = 95$; $\le 5\% = 80$.
3. **Date Proximity ($D$, 15%)**: Day difference. 0 days $= 100$; $\le 3$ days $= 90 - (3 \times \text{days})$; $\le 7$ days $= 70 - (2 \times \text{days})$.
4. **Reference Similarity ($R$, 15%)**: Normalized alphanumeric reference/invoice number matching.

### Decision Policy Thresholds

- **95 – 100% (`AUTO_RESOLVE`)**: High-confidence match. Resolvable exceptions are automatically marked `AUTO_RESOLVED` and logged to audit.
- **70 – 94% (`HUMAN_APPROVAL_REQUIRED`)**: Medium-confidence match / partial match. Routed to finance team for 1-click Approval/Rejection.
- **Below 70% (`MANUAL_INVESTIGATION`)**: Low-confidence or unknown vendor. Flagged as High Risk for manual escalation.

---

## 🧮 Dynamic Finance Control Score Formula

The **Finance Control Score (0 – 100)** measures overall financial operational health:

$$\text{Score} = 50 + \text{MatchBonus} - \text{ExceptionPenalty} - \text{DataQualityPenalty} + \text{ResolutionBonus}$$

- **Base Score**: $50.0$
- **Match Bonus ($0 - 25$)**: $\text{Reconciliation Match Rate} \times 25$
- **Exception Penalty ($0 - 20$)**: Weighted by open exception severity ($\text{High} \times 4 + \text{Medium} \times 2 + \text{Low} \times 0.5$)
- **Data Quality Penalty ($0 \text{ or } 5$)**: $-5$ penalty if total match rate is below $80\%$
- **Resolution Bonus ($0 - 10$)**: Ratio of resolved/approved exceptions $\times 10$

---

## 🔮 Next Phase Integrations

### 1. Firebase Integration Plan
- The storage layer in `app/models/store.py` is isolated behind simple function calls (`save_transaction`, `get_exceptions`, etc.).
- To enable Firebase Firestore:
  1. Add `firebase-admin` to `requirements.txt`.
  2. Create `app/services/firebase_service.py` to initialize Firestore client using service account credentials configured in `config.py`.
  3. Replace in-memory dict accesses in `app/models/store.py` with Firestore collection operations (`db.collection('transactions').doc().set()`).

### 2. Real AI (Gemini / LLM) Integration Plan
- High-level root cause generation in `insight_service.py` and exception explanation in `reconciliation_service.py` are modularized.
- To enable real AI API calls:
  1. Add `google-genai` or `openai` package to `requirements.txt`.
  2. Set `AI_API_ENABLED = True` in `config.py`.
  3. In `insight_service.py` / `resolution_service.py`, pass structured exception context into Gemini prompt templates to generate dynamic natural language explanations alongside the deterministic rule-based scores.
