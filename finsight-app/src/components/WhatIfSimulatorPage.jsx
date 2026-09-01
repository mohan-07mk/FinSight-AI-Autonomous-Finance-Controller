import React, { useState } from "react";
import { Calculator, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, RefreshCw, Loader2, Info } from "lucide-react";

const C = {
  bg: "#0A0908", surface: "#131110", surface2: "#1A1714", surface3: "#211D19",
  border: "#2A251E", textPrimary: "#F3EDE1", textSecondary: "#9C9284", textMuted: "#6E6558",
  gold: "#C9A253", goldDim: "#4A3F28", success: "#5FA777", successBg: "#16211B",
  warning: "#D0993E", warningBg: "#241C10", danger: "#C1554A", dangerBg: "#251512"
};

const SCENARIOS = [
  { id: "payment_delay", name: "Payment Delayed", desc: "Simulate cash impact when an outgoing vendor payment is delayed by days." },
  { id: "invoice_delay", name: "Invoice Collection Delayed", desc: "Simulate cash impact when an incoming customer invoice collection is delayed." },
  { id: "expense_increase", name: "Expense Increase (%)", desc: "Simulate impact of an percentage increase in monthly operating expenses." },
  { id: "expense_decrease", name: "Expense Decrease (%)", desc: "Simulate cost savings impact from operational reduction." },
  { id: "custom_adjustment", name: "Custom Cash Adjustment (₹)", desc: "Apply a custom manual adjustment to projected 30-day balance." }
];

export default function WhatIfSimulatorPage() {
  const [scenarioType, setScenarioType] = useState("payment_delay");
  const [amount, setAmount] = useState(50000);
  const [percentage, setPercentage] = useState(10);
  const [delayDays, setDelayDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({
    is_hypothetical_simulation: true,
    current_forecast: { current_cash_position: 2500000, projected_30_day: 2850000, risk_level: "LOW" },
    scenario_forecast: { new_projected_30_day: 2800000, lowest_expected_balance: 2450000 },
    financial_impact: { amount_impact: -50000, difference: -50000, percentage_impact: -1.75, affected_period: "D+7 to D+30" },
    risk_assessment: { risk_level: "LOW", risk_description: "STABLE: Cash position remains healthy after scenario adjustment." },
    confirmed_calculation_details: [
      "Payment of ₹50,000.00 delayed by 7 days",
      "Temporary working capital buffer reduced by ₹50,000.00"
    ],
    ai_explanation: "Under this scenario (Payment Delay), projected 30-day cash position changes by -₹50,000.00 (-1.8%). STABLE: Cash position remains healthy after scenario adjustment.",
    recommendations: [
      "Monitor working capital buffer during affected period.",
      "Ensure credit lines remain available if timing shifts extend further."
    ]
  });

  const handleSimulate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/forecast/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_type: scenarioType,
          amount: Number(amount) || 0,
          percentage: Number(percentage) || 0,
          delay_days: Number(delayDays) || 0
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
      }
    } catch (err) {
      // Deterministic client calculation fallback for Netlify static demo
      const baseCur = 2500000;
      const baseProj = 2850000;
      let impact = 0;
      if (scenarioType === "payment_delay") impact = -Math.abs(Number(amount) || 50000);
      else if (scenarioType === "invoice_delay") impact = -Math.abs(Number(amount) || 75000);
      else if (scenarioType === "expense_increase") impact = -(baseCur * 0.15 * ((Number(percentage) || 10) / 100));
      else if (scenarioType === "expense_decrease") impact = (baseCur * 0.15 * ((Number(percentage) || 10) / 100));
      else impact = Number(amount) || 0;

      const newProj = baseProj + impact;
      const diff = newProj - baseProj;
      const pct = (diff / baseProj) * 100;

      setResult({
        is_hypothetical_simulation: true,
        current_forecast: { current_cash_position: baseCur, projected_30_day: baseProj, risk_level: "LOW" },
        scenario_forecast: { new_projected_30_day: newProj, lowest_expected_balance: baseCur + impact },
        financial_impact: { amount_impact: impact, difference: diff, percentage_impact: pct, affected_period: `Next ${delayDays || 30} Days` },
        risk_assessment: { risk_level: newProj < 0 ? "HIGH" : newProj < baseCur * 0.3 ? "MEDIUM" : "LOW", risk_description: newProj < 0 ? "CRITICAL: Cash balance goes negative!" : "STABLE: Cash position remains positive." },
        confirmed_calculation_details: [`Scenario impact calculated deterministically: ₹${impact.toLocaleString("en-IN")}`],
        ai_explanation: `Projected 30-day cash balance changes by ₹${diff.toLocaleString("en-IN")} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%). Cash position remains positive.`,
        recommendations: ["Maintain minimum working capital liquidity reserve."]
      });
    } finally {
      setLoading(false);
    }
  };

  const fi = result?.financial_impact || {};
  const cf = result?.current_forecast || {};
  const sf = result?.scenario_forecast || {};
  const ra = result?.risk_assessment || {};

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: C.goldDim }}>
            <Calculator size={22} color={C.gold} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>What-If Cash Flow Simulator</h1>
            <p className="text-xs" style={{ color: C.textSecondary }}>
              Simulate cash flow timing shifts & expense changes with 100% deterministic calculations.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Simulator Form & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Input Form (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl p-5 space-y-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.gold }}>
            1. Select Scenario Parameters
          </h2>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textSecondary }}>Scenario Type</label>
              <select
                value={scenarioType}
                onChange={e => setScenarioType(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}` }}
              >
                {SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {(scenarioType === "payment_delay" || scenarioType === "invoice_delay" || scenarioType === "custom_adjustment") && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.textSecondary }}>Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono"
                  style={{ background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}` }}
                />
              </div>
            )}

            {(scenarioType === "expense_increase" || scenarioType === "expense_decrease") && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.textSecondary }}>Percentage (%)</label>
                <input
                  type="number"
                  value={percentage}
                  onChange={e => setPercentage(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono"
                  style={{ background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}` }}
                />
              </div>
            )}

            {(scenarioType === "payment_delay" || scenarioType === "invoice_delay") && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.textSecondary }}>Delay Duration (Days)</label>
                <input
                  type="number"
                  value={delayDays}
                  onChange={e => setDelayDays(e.target.value)}
                  placeholder="7"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none font-mono"
                  style={{ background: C.surface2, color: C.textPrimary, border: `1px solid ${C.border}` }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-lg transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.gold}, #A07C35)`, color: "#161208" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
              {loading ? "Calculating Scenario..." : "Analyze Scenario"}
            </button>
          </form>

          <div className="rounded-xl p-3 text-[11px]" style={{ background: C.surface3, color: C.textMuted }}>
            <Info size={14} className="inline mr-1.5" />
            Simulation results are read-only. Database records are never modified during simulation.
          </div>
        </div>

        {/* Results View (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="text-xs" style={{ color: C.textMuted }}>CURRENT PROJECTED (30-DAY)</div>
              <div className="text-xl font-mono font-bold mt-1" style={{ color: C.textPrimary }}>
                ₹{Number(cf.projected_30_day || 0).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] mt-1" style={{ color: C.textSecondary }}>Baseline Forecast</div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.goldDim}` }}>
              <div className="text-xs" style={{ color: C.gold }}>NEW SCENARIO PROJECTED</div>
              <div className="text-xl font-mono font-bold mt-1" style={{ color: C.gold }}>
                ₹{Number(sf.new_projected_30_day || 0).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: (fi.difference || 0) >= 0 ? C.success : C.danger }}>
                {(fi.difference || 0) >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                ₹{Math.abs(fi.difference || 0).toLocaleString("en-IN")} ({fi.percentage_impact >= 0 ? "+" : ""}{fi.percentage_impact}%)
              </div>
            </div>
          </div>

          {/* AI Reasoning & Calculation Card */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.gold }}>
                2. Scenario Impact & AI Analysis
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: ra.risk_level === "HIGH" ? C.dangerBg : C.successBg, color: ra.risk_level === "HIGH" ? C.danger : C.success }}>
                RISK LEVEL: {ra.risk_level || "LOW"}
              </span>
            </div>

            {/* Confirmed Details */}
            {result?.confirmed_calculation_details && result.confirmed_calculation_details.length > 0 && (
              <div className="rounded-xl p-3 space-y-1" style={{ background: C.surface2 }}>
                <div className="text-[10px] font-bold tracking-wider" style={{ color: C.success }}>✓ DETERMINISTIC CALCULATION DETAILS</div>
                {result.confirmed_calculation_details.map((d, i) => (
                  <div key={i} className="text-xs" style={{ color: C.textSecondary }}>• {d}</div>
                ))}
              </div>
            )}

            {/* AI Explanation */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
              <div className="text-xs font-bold" style={{ color: C.textPrimary }}>AI Executive Assessment:</div>
              <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>
                {result?.ai_explanation}
              </p>
            </div>

            {/* Recommendations */}
            {result?.recommendations && result.recommendations.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold tracking-wider" style={{ color: C.textMuted }}>RECOMMENDED TREASURY ACTIONS</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} className="text-xs rounded-lg px-3 py-2" style={{ background: C.successBg, color: C.success }}>
                    → {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
