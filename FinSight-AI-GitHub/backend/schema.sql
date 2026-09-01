-- ====================================================================
-- FinSight AI — Supabase PostgreSQL Schema Migration
-- Database Schema for Autonomous Finance Controller
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'finance_analyst',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. UPLOADED FILES TABLE
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'bank', 'invoice', 'ledger'
    record_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT UNIQUE NOT NULL,
    date TEXT,
    vendor_name TEXT,
    normalized_vendor_name TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    reference TEXT,
    transaction_type TEXT DEFAULT 'payment',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT UNIQUE NOT NULL,
    date TEXT,
    vendor_name TEXT,
    normalized_vendor_name TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    invoice_reference TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEDGER RECORDS TABLE
CREATE TABLE IF NOT EXISTS ledger_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id TEXT UNIQUE NOT NULL,
    date TEXT,
    vendor_name TEXT,
    normalized_vendor_name TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    reference TEXT,
    account_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RECONCILIATION RESULTS TABLE
CREATE TABLE IF NOT EXISTS reconciliation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL,
    invoice_id TEXT,
    ledger_id TEXT,
    status TEXT NOT NULL,
    overall_confidence NUMERIC(5, 2) NOT NULL,
    vendor_similarity NUMERIC(5, 2) DEFAULT 0,
    amount_similarity NUMERIC(5, 2) DEFAULT 0,
    date_similarity NUMERIC(5, 2) DEFAULT 0,
    reference_similarity NUMERIC(5, 2) DEFAULT 0,
    amount_difference NUMERIC(15, 2) DEFAULT 0,
    date_difference_days INTEGER DEFAULT -1,
    explanation TEXT,
    decision_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EXCEPTIONS TABLE
CREATE TABLE IF NOT EXISTS exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_id TEXT UNIQUE NOT NULL,
    transaction_id TEXT,
    exception_type TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    description TEXT,
    recommended_action TEXT,
    confidence_score NUMERIC(5, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    decision_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EXCEPTION EVIDENCE TABLE
CREATE TABLE IF NOT EXISTS exception_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_id TEXT NOT NULL,
    evidence_type TEXT,
    evidence_key TEXT,
    evidence_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id TEXT UNIQUE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    transaction_id TEXT,
    exception_id TEXT,
    event_type TEXT NOT NULL,
    original_data JSONB,
    match_analysis JSONB,
    evidence JSONB,
    confidence_score NUMERIC(5, 2) DEFAULT 0,
    recommendation TEXT,
    decision_type TEXT,
    final_action TEXT,
    actor TEXT DEFAULT 'SYSTEM'
);

-- 10. AI INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    evidence TEXT,
    possible_root_cause TEXT,
    confidence NUMERIC(5, 2) DEFAULT 0,
    severity TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CASH FORECASTS TABLE
CREATE TABLE IF NOT EXISTS cash_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date DATE DEFAULT CURRENT_DATE,
    current_cash_position NUMERIC(15, 2) DEFAULT 0,
    expected_incoming NUMERIC(15, 2) DEFAULT 0,
    expected_outgoing NUMERIC(15, 2) DEFAULT 0,
    projected_cash_position NUMERIC(15, 2) DEFAULT 0,
    risk_level TEXT DEFAULT 'low',
    recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON transactions(normalized_vendor_name);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(normalized_vendor_name);
CREATE INDEX IF NOT EXISTS idx_ledger_vendor ON ledger_records(normalized_vendor_name);
CREATE INDEX IF NOT EXISTS idx_recon_txn ON reconciliation_results(transaction_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_txn ON exceptions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_risk ON exceptions(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
