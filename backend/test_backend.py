"""
FinSight AI — Comprehensive Backend Test Suite
Tests all API endpoints, file uploads, validation errors, reconciliation matching,
exception detection, confidence scoring, approval workflow, audit trail, dashboard,
insights, and cash forecast.
"""
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import app
from app.models import store

client = TestClient(app)


def test_suite():
    print("==================================================")
    print("STARTING FINSIGHT AI BACKEND TEST SUITE")
    print("==================================================\n")

    # 0. Clear Store
    store.clear_all()

    # 1. Health Check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    assert res.json()["success"] is True
    print("[OK] 1. Health Check Endpoint Passed")

    # 2. File Upload Tests - Invalid & Empty Files
    res = client.post("/api/upload/bank", files={"file": ("empty.csv", b"", "text/csv")})
    assert res.status_code == 400
    print("[OK] 2a. Empty File Validation Passed")

    res = client.post("/api/upload/bank", files={"file": ("test.txt", b"invalid data", "text/plain")})
    assert res.status_code == 400
    print("[OK] 2b. Invalid Extension Validation Passed")

    invalid_cols_csv = b"col1,col2,col3\n1,2,3"
    res = client.post("/api/upload/bank", files={"file": ("bad_cols.csv", invalid_cols_csv, "text/csv")})
    assert res.status_code == 400
    assert "Missing required columns" in res.json()["detail"]
    print("[OK] 2c. Missing Column Validation Passed")

    # 3. File Upload Tests - Valid Files (Bank, Invoice, Ledger)
    data_dir = Path(__file__).resolve().parent / "app" / "data"

    with open(data_dir / "sample_bank.csv", "rb") as f:
        res = client.post("/api/upload/bank", files={"file": ("sample_bank.csv", f, "text/csv")})
        assert res.status_code == 200
        assert res.json()["data"]["count"] == 14
    print("[OK] 3a. Bank Statement Upload Passed (14 records)")

    with open(data_dir / "sample_invoices.csv", "rb") as f:
        res = client.post("/api/upload/invoices", files={"file": ("sample_invoices.csv", f, "text/csv")})
        assert res.status_code == 200
        assert res.json()["data"]["count"] == 12
    print("[OK] 3b. Invoice Batch Upload Passed (12 records)")

    with open(data_dir / "sample_ledger.csv", "rb") as f:
        res = client.post("/api/upload/ledger", files={"file": ("sample_ledger.csv", f, "text/csv")})
        assert res.status_code == 200
        assert res.json()["data"]["count"] == 10
    print("[OK] 3c. Ledger ERP Upload Passed (10 records)")

    # 4. Reconciliation Engine Run
    res = client.post("/api/reconciliation/run")
    assert res.status_code == 200
    recon_data = res.json()["data"]
    assert recon_data["total_transactions"] == 14
    print(f"[OK] 4. Reconciliation Run Executed: {recon_data}")

    # 5. Fetch Reconciliation Results & Verify Scenarios
    res = client.get("/api/reconciliation/results")
    assert res.status_code == 200
    results = {r["transaction_id"]: r for r in res.json()["data"]}

    # Scenario 1: Exact Match (TXN-1030 vs INV-001)
    t1030 = results.get("TXN-1030")
    assert t1030["status"] == "Matched"
    assert t1030["confidence"] >= 95
    assert t1030["possible_invoice_id"] == "INV-001"
    print(f"[OK] Scenario 1 (Exact Match): TXN-1030 matched with INV-001, confidence {t1030['confidence']}%")

    # Scenario 2: Partial Payment (TXN-1038: 10,000 vs INV-009: 10,500)
    t1038 = results.get("TXN-1038")
    assert t1038["status"] in ("Partial Match", "AI Review")
    assert t1038["possible_invoice_id"] == "INV-009"
    assert t1038["amount_difference"] == -500.0
    print(f"[OK] Scenario 2 (Partial Payment): TXN-1038 matched with INV-009, diff: INR {t1038['amount_difference']}")

    # Scenario 3: Amount Mismatch (TXN-1033: 20,956 vs INV-004: 21,456)
    t1033 = results.get("TXN-1033")
    assert t1033["amount_difference"] == -500.0
    print(f"[OK] Scenario 3 (Amount Mismatch): TXN-1033 diff INR {t1033['amount_difference']}")

    # Scenario 4: Unknown Vendor (TXN-1043)
    t1043 = results.get("TXN-1043")
    assert t1043["status"] == "Unmatched"
    assert t1043["confidence"] < 50
    print(f"[OK] Scenario 4 (Unknown Vendor): TXN-1043 unmatched with low confidence")

    # 6. Exception Detection Verification
    res = client.get("/api/exceptions")
    assert res.status_code == 200
    exceptions = res.json()["data"]
    assert len(exceptions) > 0
    print(f"[OK] 6. Exception Detection Passed ({len(exceptions)} exceptions detected)")

    # Verify Duplicate Payment Detection (TXN-1039 vs TXN-1040)
    dup_excs = [e for e in exceptions if "Duplicate" in e["exception_type"]]
    assert len(dup_excs) > 0, "Duplicate payment exception not detected!"
    print(f"[OK] Scenario 6 (Duplicate Payment): {dup_excs[0]['description']}")

    # 7. Confidence-Based Decision & Approval Workflows
    # Find open exception to test Approval
    open_excs = [e for e in exceptions if e["status"] in ("OPEN", "PENDING_APPROVAL")]
    assert len(open_excs) > 0, "No open exceptions to test approval workflow!"
    target_exc_id = open_excs[0]["exception_id"]

    # Test Approve
    res = client.post(f"/api/exceptions/{target_exc_id}/approve", json={"actor": "Finance Lead", "notes": "Approved variance"})
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "APPROVED"
    print(f"[OK] 7a. Approve Workflow Passed for {target_exc_id}")

    # Test Reject
    if len(open_excs) > 1:
        target_exc_id_2 = open_excs[1]["exception_id"]
        res = client.post(f"/api/exceptions/{target_exc_id_2}/reject", json={"actor": "Auditor", "notes": "Amount invalid"})
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "REJECTED"
        print(f"[OK] 7b. Reject Workflow Passed for {target_exc_id_2}")

    # Test Escalate
    if len(open_excs) > 2:
        target_exc_id_3 = open_excs[2]["exception_id"]
        res = client.post(f"/api/exceptions/{target_exc_id_3}/escalate", json={"actor": "Controller", "notes": "Needs fraud team"})
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "ESCALATED"
        print(f"[OK] 7c. Escalate Workflow Passed for {target_exc_id_3}")

    # 8. Audit Trail Verification (Immutable append-only log)
    res = client.get("/api/audit")
    assert res.status_code == 200
    audits = res.json()["data"]
    assert len(audits) >= 5
    print(f"[OK] 8. Audit Trail Verification Passed ({len(audits)} immutable audit records)")

    # 9. Dashboard Overview API
    res = client.get("/api/dashboard/overview")
    assert res.status_code == 200
    dash = res.json()["data"]
    assert "finance_control_score" in dash
    assert dash["reconciliation"]["total_transactions"] == 14
    print(f"[OK] 9. Dashboard API Passed (Finance Control Score: {dash['finance_control_score']})")

    # 10. AI Insights API
    res = client.get("/api/insights")
    assert res.status_code == 200
    insights = res.json()["data"]
    assert len(insights) > 0
    print(f"[OK] 10. AI Insights API Passed ({len(insights)} insights generated)")

    # 11. Cash Forecast API
    res = client.get("/api/forecast")
    assert res.status_code == 200
    forecast = res.json()["data"]
    assert "current_cash_position" in forecast
    assert len(forecast["daily_forecast"]) == 38
    print(f"[OK] 11. Cash Forecast API Passed (Risk level: {forecast['risk_level']})")

    print("\n==================================================")
    print("ALL TEST CASES PASSED SUCCESSFULLY (11/11)")
    print("==================================================")


if __name__ == "__main__":
    test_suite()
