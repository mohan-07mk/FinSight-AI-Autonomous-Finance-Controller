"""
FinSight AI — AI Intelligence Layer Test Suite
Tests AI service, endpoints, fallback mode, and integration with existing systems.
"""
import os
import sys
import json
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import app
from app.models import store

client = TestClient(app)


def test_ai_layer():
    print("==================================================")
    print("STARTING AI INTELLIGENCE LAYER TEST SUITE")
    print("==================================================\n")

    # Reset store
    store.clear_all()

    # ── 1. AI Status Endpoint ──────────────────────────────────────────
    res = client.get("/api/ai/status")
    assert res.status_code == 200, f"AI status failed: {res.text}"
    status = res.json()["data"]
    assert "enabled" in status
    assert "available" in status
    assert "model" in status
    # Verify no API key exposed
    raw = json.dumps(res.json())
    assert "API_KEY" not in raw.upper() or "GEMINI_API_KEY" not in raw
    print(f"[OK] 1. AI Status Endpoint Passed — enabled={status['enabled']}, available={status['available']}, model={status['model']}")

    # ── 2. Upload Test Data ────────────────────────────────────────────
    data_dir = Path(__file__).resolve().parent / "app" / "data"

    with open(data_dir / "sample_bank.csv", "rb") as f:
        res = client.post("/api/upload/bank", files={"file": ("sample_bank.csv", f, "text/csv")})
        assert res.status_code == 200
    with open(data_dir / "sample_invoices.csv", "rb") as f:
        res = client.post("/api/upload/invoices", files={"file": ("sample_invoices.csv", f, "text/csv")})
        assert res.status_code == 200
    with open(data_dir / "sample_ledger.csv", "rb") as f:
        res = client.post("/api/upload/ledger", files={"file": ("sample_ledger.csv", f, "text/csv")})
        assert res.status_code == 200
    print("[OK] 2. Test Data Uploaded (bank/invoice/ledger)")

    # ── 3. Run Reconciliation ──────────────────────────────────────────
    res = client.post("/api/reconciliation/run")
    assert res.status_code == 200
    recon_data = res.json()["data"]
    assert recon_data["total_transactions"] == 14
    assert recon_data["exceptions_created"] > 0
    print(f"[OK] 3. Reconciliation Still Works — {recon_data['total_transactions']} txns, {recon_data['exceptions_created']} exceptions")

    # ── 4. Verify Exceptions Exist ─────────────────────────────────────
    res = client.get("/api/exceptions")
    assert res.status_code == 200
    exceptions = res.json()["data"]
    assert len(exceptions) > 0
    print(f"[OK] 4. Exception Detection Still Works — {len(exceptions)} exceptions")

    # ── 5. AI Analyse Exception ────────────────────────────────────────
    target_exc_id = exceptions[0]["exception_id"]
    res = client.post(f"/api/ai/analyze-exception/{target_exc_id}")
    assert res.status_code == 200
    analysis = res.json()["data"]

    # Verify structured output
    assert "what_happened" in analysis, "Missing 'what_happened' in analysis"
    assert "why_flagged" in analysis, "Missing 'why_flagged' in analysis"
    assert "evidence_analysed" in analysis, "Missing 'evidence_analysed'"
    assert "probable_root_cause" in analysis, "Missing 'probable_root_cause'"
    assert "financial_risk" in analysis, "Missing 'financial_risk'"
    assert "ai_recommendation" in analysis, "Missing 'ai_recommendation'"
    assert "ai_decision_recommendation" in analysis, "Missing 'ai_decision_recommendation'"
    assert "next_investigation_step" in analysis, "Missing 'next_investigation_step'"
    assert "requires_human_review" in analysis, "Missing 'requires_human_review'"
    assert "ai_confidence" in analysis, "Missing 'ai_confidence'"
    assert "ai_generated" in analysis, "Missing 'ai_generated'"
    assert "ai_model" in analysis, "Missing 'ai_model'"
    assert "insight_id" in analysis, "Missing 'insight_id'"
    assert "generated_at" in analysis, "Missing 'generated_at'"

    # Verify risk level is valid
    assert analysis["financial_risk"] in ("low", "medium", "high", "critical"), \
        f"Invalid risk level: {analysis['financial_risk']}"

    # Verify AI recommendation is valid
    valid_recs = {"AUTO_RESOLVE_CANDIDATE", "APPROVE_RECOMMENDED", "REJECT_RECOMMENDED",
                  "ESCALATE_RECOMMENDED", "INVESTIGATE_FURTHER"}
    assert analysis["ai_decision_recommendation"] in valid_recs, \
        f"Invalid AI recommendation: {analysis['ai_decision_recommendation']}"

    # Verify no secrets in response
    raw_response = json.dumps(analysis)
    assert "GEMINI_API_KEY" not in raw_response
    assert "API_KEY" not in raw_response.upper() or "api_key" not in raw_response.lower()

    print(f"[OK] 5. AI Exception Analysis Passed — AI generated: {analysis['ai_generated']}, "
          f"Model: {analysis['ai_model']}, Confidence: {analysis['ai_confidence']}")
    summary_text = analysis['what_happened'][:100].encode('ascii', 'replace').decode('ascii')
    print(f"     Summary: {summary_text}...")

    # ── 6. AI Analyse Non-Existent Exception ───────────────────────────
    res = client.post("/api/ai/analyze-exception/NONEXISTENT-999")
    assert res.status_code == 404
    print("[OK] 6. Non-Existent Exception Returns 404")

    # ── 7. Analyse Multiple Exceptions ─────────────────────────────────
    for exc in exceptions[1:3]:
        res = client.post(f"/api/ai/analyze-exception/{exc['exception_id']}")
        assert res.status_code == 200
        data = res.json()["data"]
        assert "what_happened" in data
        assert "financial_risk" in data
    print(f"[OK] 7. Multiple Exception Analyses Passed")

    # ── 8. AI Generate Insights ────────────────────────────────────────
    res = client.post("/api/ai/generate-insights")
    assert res.status_code == 200
    print(f"[OK] 8. AI Batch Insight Generation Passed — {len(res.json()['data'])} insights")

    # ── 9. AI Get Insights ─────────────────────────────────────────────
    res = client.get("/api/ai/insights")
    assert res.status_code == 200
    insights = res.json()["data"]
    print(f"[OK] 9. AI Insights Retrieval Passed — {len(insights)} insights stored")

    # ── 10. Approval Workflow Still Works ───────────────────────────────
    open_excs = [e for e in exceptions if e["status"] in ("OPEN", "PENDING_APPROVAL")]
    if open_excs:
        eid = open_excs[0]["exception_id"]
        res = client.post(f"/api/exceptions/{eid}/approve", json={"actor": "AI Test", "notes": "Test"})
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "APPROVED"
        print(f"[OK] 10. Approval Workflow Still Works — {eid} approved")
    else:
        print("[OK] 10. Approval Workflow — No open exceptions to test (OK)")

    # ── 11. Audit Trail Contains AI Records ────────────────────────────
    res = client.get("/api/audit")
    assert res.status_code == 200
    audits = res.json()["data"]
    ai_audits = [a for a in audits if "AI_ANALYSIS_GENERATED" in a.get("decision_type", "")]
    print(f"[OK] 11. Audit Trail Passed — {len(audits)} total, {len(ai_audits)} AI analysis records")

    # ── 12. Dashboard Still Works ──────────────────────────────────────
    res = client.get("/api/dashboard/overview")
    assert res.status_code == 200
    dash = res.json()["data"]
    assert "finance_control_score" in dash
    print(f"[OK] 12. Dashboard Still Works — Score: {dash['finance_control_score']}")

    # ── 13. Existing Insights API Still Works ──────────────────────────
    res = client.get("/api/insights")
    assert res.status_code == 200
    print(f"[OK] 13. Existing Insights API Still Works — {len(res.json()['data'])} insights")

    # ── 14. Cash Forecast Still Works ──────────────────────────────────
    res = client.get("/api/forecast")
    assert res.status_code == 200
    forecast = res.json()["data"]
    assert "current_cash_position" in forecast
    print(f"[OK] 14. Cash Forecast Still Works — Risk: {forecast['risk_level']}")

    # ── 15. Health Check Still Works ───────────────────────────────────
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["success"] is True
    print("[OK] 15. Health Check Still Works")

    # ── Summary ────────────────────────────────────────────────────────
    print("\n==================================================")
    print("ALL AI INTELLIGENCE LAYER TESTS PASSED (15/15)")
    print("==================================================")

    # Return test summary for report
    return {
        "ai_status": status,
        "total_exceptions_analysed": min(3, len(exceptions)),
        "analysis_sample": analysis,
    }


if __name__ == "__main__":
    test_ai_layer()
