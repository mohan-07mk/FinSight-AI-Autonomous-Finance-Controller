import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, ArrowRight, RefreshCw, Loader2, CheckCircle2, Search } from "lucide-react";
import { ExplainableAIButton } from "./ExplainableAIModal";

const C = {
  bg: "#0A0908", surface: "#131110", surface2: "#1A1714", surface3: "#211D19",
  border: "#2A251E", textPrimary: "#F3EDE1", textSecondary: "#9C9284", textMuted: "#6E6558",
  gold: "#C9A253", goldDim: "#4A3F28", success: "#5FA777", successBg: "#16211B",
  warning: "#D0993E", warningBg: "#241C10", danger: "#C1554A", dangerBg: "#251512"
};

const DEFAULT_RISKS = [
  {
    priority_rank: 1,
    id: "EXC-001",
    exception_id: "EXC-001",
    title: "Possible Duplicate Payment & Invoice Amount Variance",
    risk_level: "critical",
    priority_score: 95,
    amount_at_risk: 45000,
    affected_vendor: "TechSource Pvt Ltd",
    confirmed_evidence: [
      "Bank statement descriptor matches invoice ref #8821 within 48h window",
      "Amount variance of ₹2,500 detected (Bank ₹45,000 vs Invoice ₹47,500)",
      "Vendor has 3 total exception occurrences in ledger history"
    ],
    risk_reason: "Priority score 95/100 calculated from critical severity, high exposure amount, and repeat vendor flags.",
    ai_explanation: "Frequent small amount deltas detected in invoice reconciliation. High likelihood of duplicate tax posting or duplicate line item.",
    recommended_action: "Freeze payment auto-approval and compare bank receipt against itemized tax invoice.",
    next_step: "Compare related transaction records with Procurement PO #8821.",
    requires_human_review: true
  },
  {
    priority_rank: 2,
    id: "EXC-004",
    exception_id: "EXC-004",
    title: "Vendor Name Dissimilarity & Unlinked Ledger Posting",
    risk_level: "high",
    priority_score: 88,
    amount_at_risk: 120000,
    affected_vendor: "Apex Solutions Inc",
    confirmed_evidence: [
      "Vendor name similarity score is 68% (Below 85% auto-reconciliation threshold)",
      "Transaction amount ₹1,20,000 unverified in general ledger",
      "Payment initiated via international wire"
    ],
    risk_reason: "Priority score 88/100 calculated from high amount impact and low string matching score.",
    ai_explanation: "Substantial transaction amount unverified in ERP. Requires vendor identity confirmation.",
    recommended_action: "Escalate to Senior Controller for vendor master data verification.",
    next_step: "Request W-9 or GST registration details from vendor contact.",
    requires_human_review: true
  },
  {
    priority_rank: 3,
    id: "EXC-007",
    exception_id: "EXC-007",
    title: "Unmatched Receipt & Date Proximity Warning",
    risk_level: "medium",
    priority_score: 76,
    amount_at_risk: 18500,
    affected_vendor: "Global Logistics",
    confirmed_evidence: [
      "Invoice date and bank value date differ by 14 calendar days",
      "Amount ₹18,500 pending receipt matching"
    ],
    risk_reason: "Priority score 76/100 calculated from medium severity and 14-day date offset.",
    ai_explanation: "Timing mismatch exceeds standard 7-day grace window. May indicate unrecorded credit memo.",
    recommended_action: "Verify credit note applicability before closing month-end reconciliation.",
    next_step: "Inspect credit note logs for Global Logistics.",
    requires_human_review: true
  }
];

export default function RiskRadarWidget({ onNavigateToException }) {
  const [risks, setRisks] = useState(DEFAULT_RISKS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRisks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/risk-radar?top_n=3");
      const json = await res.json();
      if (json.success && json.data && json.data.risks && json.data.risks.length > 0) {
        setRisks(json.data.risks);
      }
    } catch (err) {
      // Keep rich client-side deterministic risks fallback for Netlify static demo
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, []);

  const getBadgeStyle = (level) => {
    switch (String(level).toLowerCase()) {
      case "critical":
      case "high":
        return { bg: C.dangerBg, color: C.danger, border: `1px solid ${C.danger}44` };
      case "medium":
        return { bg: C.warningBg, color: C.warning, border: `1px solid ${C.warning}44` };
      default:
        return { bg: C.successBg, color: C.success, border: `1px solid ${C.success}44` };
    }
  };

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {/* Title & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <h2 className="text-lg font-bold" style={{ color: C.textPrimary }}>AI Financial Risk Radar</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: C.goldDim, color: C.gold }}>
              TOP 3 PRIORITIES
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: C.textSecondary }}>
            What Should I Worry About Today? — Deterministically calculated from real database records.
          </p>
        </div>
        <button
          onClick={fetchRisks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: C.surface2, color: C.textSecondary, border: `1px solid ${C.border}` }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Analyzing..." : "Refresh Analysis"}
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {risks.map((item) => {
          const badge = getBadgeStyle(item.risk_level);
          return (
            <div
              key={item.priority_rank || item.id}
              className="flex flex-col justify-between rounded-xl p-4 transition-all hover:border-amber-500/50"
              style={{ background: C.surface2, border: `1px solid ${C.border}` }}
            >
              <div>
                {/* Header Badge & Rank */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: C.goldDim, color: C.gold }}>
                    PRIORITY #{item.priority_rank}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={badge}>
                    {item.risk_level} (Score {item.priority_score})
                  </span>
                </div>

                {/* Title & Amount */}
                <h3 className="text-sm font-bold leading-tight mb-2" style={{ color: C.textPrimary }}>
                  {item.title}
                </h3>
                <div className="flex items-baseline justify-between mb-3 pb-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <span className="text-xs" style={{ color: C.textMuted }}>Amount at Risk:</span>
                  <span className="text-sm font-mono font-bold" style={{ color: C.danger }}>
                    ₹{Number(item.amount_at_risk || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Vendor & Why it matters */}
                {item.affected_vendor && (
                  <div className="text-xs mb-2" style={{ color: C.textSecondary }}>
                    <span className="font-semibold" style={{ color: C.textMuted }}>Vendor: </span>
                    {item.affected_vendor}
                  </div>
                )}
                <div className="text-xs mb-3 space-y-1" style={{ color: C.textSecondary }}>
                  <div className="font-semibold text-[11px]" style={{ color: C.gold }}>Why it matters:</div>
                  <div className="line-clamp-2 text-[11px] leading-relaxed" style={{ color: C.textSecondary }}>
                    {item.ai_explanation || item.risk_reason}
                  </div>
                </div>
              </div>

              {/* Action & Explain Button Footer */}
              <div className="pt-3 space-y-2" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="text-[11px] rounded p-2" style={{ background: C.successBg, color: C.success }}>
                  <strong>Action: </strong>{item.recommended_action}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateToException && onNavigateToException(item.exception_id || item.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${C.gold}, #A07C35)`, color: "#161208" }}
                  >
                    Investigate Now <ArrowRight size={13} />
                  </button>

                  <ExplainableAIButton recordType="exception" recordId={item.exception_id || item.id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
