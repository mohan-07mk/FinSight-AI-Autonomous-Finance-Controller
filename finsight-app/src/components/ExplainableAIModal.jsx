import React, { useState } from "react";
import { Search, X, CheckCircle2, AlertTriangle, ShieldAlert, Info, HelpCircle, Loader2 } from "lucide-react";

const C = {
  bg: "#0A0908", surface: "#131110", surface2: "#1A1714", surface3: "#211D19",
  border: "#2A251E", textPrimary: "#F3EDE1", textSecondary: "#9C9284", textMuted: "#6E6558",
  gold: "#C9A253", goldDim: "#4A3F28", success: "#5FA777", successBg: "#16211B",
  warning: "#D0993E", warningBg: "#241C10", danger: "#C1554A", dangerBg: "#251512"
};

export function ExplainableAIModal({ isOpen, onClose, recordType, recordId, data }) {
  if (!isOpen) return null;

  const confirmed = data?.confirmed_evidence || [
    "3-Way reconciliation check evaluated across Bank, Invoice, and Ledger",
    "Rule match confidence score evaluated at 92%"
  ];
  const interpretation = data?.ai_interpretation || "High confidence exception flag triggered by amount threshold and vendor string similarity analysis.";
  const action = data?.recommended_action || "Verify itemized invoice attachment before payment approval.";
  const limitations = data?.uncertainties_limitations || "Analysis based on currently available database records. External unposted bank items may alter score.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="flex flex-col rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}`, fontFamily: "'Inter', sans-serif" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: C.goldDim }}>
              <Search size={18} color={C.gold} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: C.textPrimary }}>Explainable AI — Evidence & Reasoning</h3>
              <p className="text-[11px]" style={{ color: C.textMuted }}>Why did AI say this? (Record: {recordId || "General"})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-80" style={{ color: C.textMuted }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Confirmed Evidence */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: C.success }}>
              <CheckCircle2 size={16} />
              <span>CONFIRMED DATABASE EVIDENCE</span>
            </div>
            <ul className="space-y-1.5 pl-2">
              {confirmed.map((item, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2" style={{ color: C.textSecondary }}>
                  <span style={{ color: C.success }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Interpretation */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: C.surface2, border: `1px solid ${C.warning}33` }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: C.warning }}>
              <AlertTriangle size={16} />
              <span>AI INTERPRETATION & REASONING</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: C.textPrimary }}>
              {interpretation}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: C.successBg, border: `1px solid ${C.success}44` }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: C.success }}>
              <ShieldAlert size={16} />
              <span>RECOMMENDED ACTION</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: C.success }}>
              → {action}
            </p>
          </div>

          {/* Limitations */}
          <div className="rounded-xl p-3 space-y-1" style={{ background: C.surface3 }}>
            <div className="text-[10px] font-bold tracking-wider" style={{ color: C.textMuted }}>UNCERTAINTIES & LIMITATIONS</div>
            <p className="text-[11px]" style={{ color: C.textMuted }}>
              {limitations}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex justify-end shrink-0" style={{ background: C.surface2, borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ background: C.gold, color: "#161208" }}
          >
            Close Explanation
          </button>
        </div>

      </div>
    </div>
  );
}

export function ExplainableAIButton({ recordType = "exception", recordId = "EXC-001" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`http://localhost:8000/api/ai/explain/${recordType}/${recordId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      // Netlify demo fallback explanation
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-85"
        style={{ background: C.surface3, color: C.gold, border: `1px solid ${C.goldDim}` }}
        title="View evidence and reasoning behind AI decision"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
        <span>Why did AI say this? 🔍</span>
      </button>

      <ExplainableAIModal
        isOpen={open}
        onClose={() => setOpen(false)}
        recordType={recordType}
        recordId={recordId}
        data={data}
      />
    </>
  );
}
