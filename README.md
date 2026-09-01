# FinSight AI – Autonomous Finance Controller

An intelligent, autonomous financial reconciliation and risk management engine powered by **FastAPI**, **React (Vite)**, **Supabase PostgreSQL**, and **Google Gemini 3.6 Flash AI**. 

FinSight AI automates 3-way financial reconciliation across bank statements, vendor invoices, and general ledger records. It detects financial anomalies in real time, provides evidence-backed AI explanations, predicts cash flow risks, and offers an interactive AI Copilot for financial controllers.

---

## 🚀 Live Demo

> Add your Netlify Live URL here

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Problem Statement](#-problem-statement)
3. [The FinSight Solution](#-the-finsight-solution)
4. [Main Features](#-main-features)
5. [Innovation & Unique Features](#-innovation--unique-features)
6. [Technology Stack](#-technology-stack)
7. [System Architecture](#-system-architecture)
8. [Project Folder Structure](#-project-folder-structure)
9. [Backend Setup](#-backend-setup)
10. [Frontend Setup](#-frontend-setup)
11. [Environment Variables Setup](#-environment-variables-setup)
12. [Supabase Database Setup (`schema.sql`)](#-supabase-database-setup-schemasql)
13. [Google Gemini AI Setup](#-google-gemini-ai-setup)
14. [How to Run Locally](#-how-to-run-locally)
15. [How to Test](#-how-to-test)
16. [Sample CSV Testing Instructions](#-sample-csv-testing-instructions)
17. [Security and AI Safety](#-security-and-ai-safety)
18. [API Documentation Overview](#-api-documentation-overview)
19. [Deployment Information](#-deployment-information)
20. [Future Improvements](#-future-improvements)

---

## 📌 Project Overview

FinSight AI is designed to solve one of the most labor-intensive tasks in corporate finance: **multi-source financial reconciliation and exception resolution**.

By uniting deterministic rule engines with LLM-powered context awareness, FinSight AI matches transactions with high precision, automatically categorizes variances, generates actionable root-cause insights, and empowers financial teams with human-in-the-loop decision-making tools.

---

## ⚠️ Problem Statement

Modern finance operations face significant operational bottlenecks:
* **Manual 3-Way Reconciliation**: Cross-referencing bank statements, vendor invoices, and ledger records consumes hundreds of accounting hours monthly.
* **Unnoticed Financial Anomalies**: Duplicate payments, currency/rounding variances, partial settlements, and fraudulent vendor patterns often go undetected until audit season.
* **Opaque AI Models**: Traditional machine learning systems act as black boxes, failing to provide accountants with clear, auditable reasoning for why an anomaly was flagged.
* **Reactive Cash Management**: Short-term liquidity issues are discovered after cash shortages occur rather than through predictive forecasting.

---

## 💡 The FinSight Solution

FinSight AI bridges the gap between automated speed and accounting rigor:
1. **Deterministic 3-Way Engine**: Multi-weighted scoring algorithm comparing Vendor Name similarity (40%), Amount match (30%), Date proximity (15%), and Reference code (15%).
2. **AI-Powered Root-Cause Analysis**: Google Gemini 3.6 Flash analyzes flagged exceptions and presents evidence-backed root causes.
3. **Financial Risk Radar**: Categorizes organizational financial risks across Duplicate Payments, Vendor Mismatches, and Shortfalls.
4. **Explainable AI (XAI)**: Generates human-readable breakdown modals explaining confidence scores and signal weights.
5. **Interactive AI Copilot**: Provides a real-time conversational assistant for inquiring about system health, specific exceptions, and cash flow projections.
6. **Deterministic Fallback**: Ensures 100% system uptime even if LLM services experience latency or quota limits.

---

## ✨ Main Features

* 🔄 **Automated 3-Way Reconciliation**: Upload Bank Statements, Invoices, and Ledger CSVs/XLSX files for instant automated matching.
* 🚨 **Exception Management & Workflows**: Review flagged anomalies with status controls (Approve, Reject, Escalate).
* 📊 **Risk Radar**: Real-time risk prioritization widget detailing critical, high, medium, and low severity exceptions.
* 🔍 **Explainable AI Modal**: Detailed breakdown showing weighted scoring metrics (Vendor %, Date delta, Amount delta, Reference match).
* 💬 **Financial AI Copilot**: Conversational interface to query financial metrics, trace transactions, and analyze root causes.
* 📈 **30-Day Cash Forecasting**: Visual projection of cash position with low/medium/high liquidity risk indicators.
* 🧮 **What-If Cash Flow Simulator**: Test scenarios like payment delays, vendor early settlement discounts, and revenue dips.
* 📜 **Immutable Audit Trail**: Tracks every system decision, rule resolution, and human action for enterprise audit compliance.

---

## 🌟 Innovation & Unique Features

* **Hybrid Intelligence Engine**: Combines deterministic fuzzy logic (`rapidfuzz`) for initial scoring with generative AI (`google-genai`) for context understanding.
* **Fail-Safe AI Resiliency**: Automatic fallback to rule-based heuristics if the Gemini API is offline or unconfigured.
* **Evidence-Based Transparency**: Every AI response requires supporting evidence fields, eliminating AI hallucinations in financial records.
* **Multi-Source Mapping**: Built-in column normalizers for non-standard CSV headers across popular ERPs (SAP, Tally, QuickBooks, Zoho).

---

## 🛠 Technology Stack

### Backend
* **Language & Framework**: Python 3.10+, FastAPI, Uvicorn
* **Database**: Supabase PostgreSQL (`supabase-py`, `psycopg2-binary`)
* **AI Integration**: Google Gemini API (`google-genai`, Model: `gemini-3.6-flash`)
* **Data Processing & Matching**: Pandas, OpenPyXL, RapidFuzz, Python-Dateutil
* **Configuration & Environment**: Pydantic, Python-Dotenv

### Frontend
* **Framework**: React 19, Vite 6
* **Styling & Design System**: Tailwind CSS v4, Custom Dark Charcoal Fintech Theme
* **Icons & Visuals**: Lucide React
* **Charts & Analytics**: Recharts
* **Deployment**: Netlify

---

## 🏗 System Architecture

```
   ┌─────────────────────────────────────────────────────────────┐
   │                     React Frontend (Vite)                   │
   │  [Dashboard] [Reconciliation] [Risk Radar] [AI Copilot]     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ REST API / JSON
   ┌──────────────────────────────▼──────────────────────────────┐
   │                     FastAPI Backend Router                  │
   │  [routes_upload]  [routes_reconciliation]  [routes_ai]      │
   └──────┬───────────────────────┬───────────────────────┬──────┘
          │                       │                       │
 ┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
 │ 3-Way Recon     │     │ Gemini 3.6      │     │ Supabase        │
 │ Engine          │     │ AI Layer        │     │ PostgreSQL      │
 │ (RapidFuzz/Rule)│     │ (GenAI SDK)     │     │ Database        │
 └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 📁 Project Folder Structure

```
FinSight-AI-GitHub/
│
├── README.md                           # Competition-ready documentation
├── .gitignore                          # Protects secrets, node_modules, & build outputs
├── netlify.toml                        # Netlify routing configuration
├── .env.example                        # Root environment variable template
│
├── backend/                            # FastAPI Python Backend
│   ├── app/
│   │   ├── api/                        # API route handlers
│   │   │   ├── routes_upload.py
│   │   │   ├── routes_reconciliation.py
│   │   │   ├── routes_exceptions.py
│   │   │   ├── routes_ai.py
│   │   │   ├── routes_copilot.py
│   │   │   ├── routes_risk_radar.py
│   │   │   ├── routes_explain.py
│   │   │   ├── routes_simulator.py
│   │   │   └── routes_dashboard.py
│   │   ├── db/                         # Supabase database client
│   │   │   └── supabase_client.py
│   │   ├── repositories/               # Data access repository layer
│   │   ├── services/                   # Business logic, AI, & Recon services
│   │   │   ├── ai_service.py
│   │   │   ├── copilot_service.py
│   │   │   ├── reconciliation_service.py
│   │   │   ├── risk_radar_service.py
│   │   │   ├── explainability_service.py
│   │   │   ├── simulator_service.py
│   │   │   └── exception_service.py
│   │   ├── utils/                      # Normalizers & validators
│   │   ├── models/                     # In-memory store & fallback models
│   │   └── config.py                   # App configuration & scoring weights
│   ├── uploads/                        # Temporary upload directory (.gitkeep)
│   ├── requirements.txt                # Python dependencies
│   ├── schema.sql                      # Supabase PostgreSQL schema definition
│   ├── .env.example                    # Backend environment variable template
│   ├── test_backend.py                 # 11-point backend core test suite
│   ├── test_ai_layer.py                # AI intelligence layer test suite
│   ├── test_copilot.py                 # AI copilot test suite
│   └── test_advanced_features.py       # Risk Radar, XAI, Simulator test suite
│
├── finsight-app/                       # React / Vite Frontend
│   ├── src/
│   │   ├── components/                 # UI Modals & Widgets
│   │   │   ├── RiskRadarWidget.jsx
│   │   │   ├── ExplainableAIModal.jsx
│   │   │   └── WhatIfSimulatorPage.jsx
│   │   ├── AICopilot.jsx               # AI Copilot chat drawer component
│   │   ├── App.jsx                     # Main Finance Controller application
│   │   ├── main.jsx                    # React root entry point
│   │   └── index.css                   # Global styles & Tailwind imports
│   ├── public/                         # Public assets
│   ├── index.html                      # HTML entry point
│   ├── package.json                    # Node dependencies
│   ├── package-lock.json               # Lockfile
│   ├── netlify.toml                    # Netlify frontend build config
│   ├── vite.config.js                  # Vite configuration
│   └── .gitignore                      # Frontend gitignore
│
└── sample-data/                        # Safe synthetic CSV files for testing
    ├── bank_transactions.csv
    ├── invoices.csv
    └── ledger_records.csv
```

---

## ⚙️ Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   * Windows (PowerShell):
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * Linux / macOS:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in your Supabase credentials and Gemini API Key.*

5. **Start the FastAPI development server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be live at `http://localhost:8000`. API Swagger documentation is available at `http://localhost:8000/docs`.

---

## 💻 Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd finsight-app
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start Vite development server**:
   ```bash
   npm run dev
   ```
   The frontend application will open at `http://localhost:5173`.

---

## 🔐 Environment Variables Setup

Create a `.env` file in the `backend/` directory (or root) based on `.env.example`:

```env
# Supabase PostgreSQL Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
AI_API_ENABLED=true
AI_MODEL=gemini-3.6-flash
```

> **IMPORTANT**: Never commit `.env` files or API keys to GitHub. `.gitignore` is configured to prevent accidental leakage.

---

## 🗄️ Supabase Database Setup (`schema.sql`)

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project or select an existing project.
3. Open the **SQL Editor** tab in Supabase.
4. Copy the complete contents of `backend/schema.sql`.
5. Execute the SQL script to create all 11 core tables and performance indexes:
   * `users`
   * `uploaded_files`
   * `transactions`
   * `invoices`
   * `ledger_records`
   * `reconciliation_results`
   * `exceptions`
   * `exception_evidence`
   * `audit_logs`
   * `ai_insights`
   * `cash_forecasts`

---

## 🤖 Google Gemini AI Setup

1. Obtain a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
2. Paste the API key into `backend/.env` under `GEMINI_API_KEY`.
3. Verify that `AI_API_ENABLED=true` and `AI_MODEL=gemini-3.6-flash`.
4. If an API key is not provided or quota is exceeded, FinSight AI automatically activates deterministic rule fallbacks without crashing.

---

## 🚀 How to Run Locally

To run both services concurrently:

1. **Terminal 1 (Backend)**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Terminal 2 (Frontend)**:
   ```bash
   cd finsight-app
   npm run dev
   ```

3. Access the Web App at `http://localhost:5173`.

---

## 🧪 How to Test

Run the Python test suites from the project root:

```bash
# 1. Run core backend integration test
python backend/test_backend.py

# 2. Run AI layer tests
python backend/test_ai_layer.py

# 3. Run AI Copilot service tests
python backend/test_copilot.py

# 4. Run Risk Radar, Explainable AI & Simulator tests
python backend/test_advanced_features.py
```

---

## 📁 Sample CSV Testing Instructions

You can test file upload and automated 3-way reconciliation using the safe synthetic test files located in `sample-data/`:

1. Open the FinSight AI Web Application (`http://localhost:5173`).
2. Go to **Reconciliation** or click **Upload Data**.
3. Upload `sample-data/bank_transactions.csv` (Bank Statement).
4. Upload `sample-data/invoices.csv` (Vendor Invoices).
5. Upload `sample-data/ledger_records.csv` (General Ledger).
6. Observe automated reconciliation results covering:
   * **Exact Match**: `Acme Cloud Systems` (100% confidence)
   * **Amount Mismatch**: `Global Logistics Ltd` (₹500 delta)
   * **Date Mismatch**: `Nexus Software Inc` (Settlement delay)
   * **Duplicate Payment**: `Vertex Tech Supplies` (Flagged within 3-day window)
   * **Partial Payment**: `Starlight Media` (₹500 shortfall)
   * **Vendor Mismatch**: `Unknown Vendor Corp` vs `Orion Traders`
   * **Reference Mismatch**: `Apex Office Solutions`

---

## 🛡️ Security and AI Safety

* **Zero Hardcoded Secrets**: Credentials are strictly loaded via environment variables.
* **Deterministic Fallbacks**: Critical financial decisions are never left solely to generative AI; rule-based heuristics safeguard output accuracy.
* **Data Sanitization**: CSV uploads are normalized, stripped of dangerous characters, and validated before storage.
* **Immutable Audit Logging**: Every exception approval, rejection, or escalation is logged with timestamp, actor, and evidence snapshot.

---

## 📡 API Documentation Overview

The FastAPI backend exposes the following endpoints (available interactively at `/docs`):

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | System health probe and Supabase/AI status |
| `/api/upload/bank` | `POST` | Upload and process bank statement CSV |
| `/api/upload/invoices` | `POST` | Upload and process invoices CSV |
| `/api/upload/ledger` | `POST` | Upload and process ledger records CSV |
| `/api/reconcile/run` | `POST` | Trigger 3-way reconciliation engine |
| `/api/exceptions/` | `GET` | List all detected exceptions |
| `/api/exceptions/{id}/action` | `POST` | Execute human approval action (Approve/Reject/Escalate) |
| `/api/ai/analyze-exception/{id}` | `POST` | Request Gemini AI root-cause analysis |
| `/api/copilot/chat` | `POST` | Send prompt to Financial AI Copilot |
| `/api/risk-radar/summary` | `GET` | Fetch real-time Risk Radar summary matrix |
| `/api/explain/{id}` | `GET` | Fetch Explainable AI decision evidence breakdown |
| `/api/simulator/run` | `POST` | Run What-If financial scenario simulation |
| `/api/dashboard/summary` | `GET` | Fetch overall finance controller metrics & score |

---

## 🌐 Deployment Information

### Frontend Deployment (Netlify)
The frontend contains `netlify.toml` configured for SPA routing:
* **Build Command**: `npm run build`
* **Publish Directory**: `dist`
* **Redirects**: `/* -> /index.html 200`

### Backend Deployment (Render / Railway / Fly.io)
* **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
* Set Environment Variables (`SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`, `AI_API_ENABLED`, `AI_MODEL`) in the hosting environment dashboard.

---

## 🔮 Future Improvements

* **Multi-Currency Support**: Real-time FX conversion & currency exchange variance tracking.
* **ERP Connectors**: Direct OAuth integrations with SAP S/4HANA, NetSuite, and QuickBooks Online.
* **OCR Receipt Parsing**: Multimodal Gemini Vision invoice extraction from PDF and image files.
* **Role-Based Access Control (RBAC)**: Fine-grained permissions for Analysts, Senior Controllers, and External Auditors.
