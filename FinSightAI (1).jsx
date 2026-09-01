import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, GitCompare, AlertTriangle, Sparkles, TrendingUp, ClipboardList,
  Settings, HelpCircle, Bell, Search, Upload, ChevronRight, ChevronDown,
  ChevronLeft, X, Check, ArrowUpRight, ArrowDownRight, Filter, ArrowUpDown,
  ShieldAlert, CheckCircle2, Clock, FileText, Menu, Brain, Zap, Link2,
  FileCheck2, FileWarning, FileX2, CircleDot, ChevronsRight, Info,
  CalendarDays, UserCircle2, XCircle, AlertCircle, Landmark, Receipt,
  Database, Eye,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, BarChart, Bar, Legend,
} from "recharts";

/* ============================================================================
   DESIGN TOKENS
   Deep charcoal fintech dashboard — warm gold accent, Bloomberg-grade
   monospace numerals, Stripe/Linear-grade spacing discipline.
============================================================================ */
const C = {
  bg: "#0A0908",
  surface: "#131110",
  surface2: "#1A1714",
  surface3: "#211D19",
  border: "#2A251E",
  borderSoft: "#211D18",
  textPrimary: "#F3EDE1",
  textSecondary: "#9C9284",
  textMuted: "#6E6558",
  gold: "#C9A253",
  goldSoft: "#8C7440",
  goldDim: "#4A3F28",
  success: "#5FA777",
  successBg: "#16211B",
  warning: "#D0993E",
  warningBg: "#241C10",
  danger: "#C1554A",
  dangerBg: "#251512",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');`;

function inr(n, opts = {}) {
  const { compact = false, showSign = false } = opts;
  const sign = n < 0 ? "-" : showSign && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (compact) {
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
    return `${sign}₹${abs}`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

/* ============================================================================
   MOCK DATA
============================================================================ */
const KPIS = {
  controlScore: 87,
  controlTrend: 4.2,
  matchRate: 94.8,
  matchedCount: 1248,
  totalCount: 1317,
  openExceptions: { total: 23, high: 6, medium: 11, low: 6 },
  cashPosition: 2480000,
  cashTrend: 320000,
  aiActions: { total: 42, autoResolved: 35, awaitingApproval: 7 },
};

const RECON_PERF = [
  { day: "Mon", rate: 91.2 },
  { day: "Tue", rate: 92.4 },
  { day: "Wed", rate: 90.8 },
  { day: "Thu", rate: 93.6 },
  { day: "Fri", rate: 94.1 },
  { day: "Sat", rate: 94.5 },
  { day: "Sun", rate: 94.8 },
];

const WORKFLOW_STEPS = [
  { label: "Data Sources", value: 3, sub: "connected" },
  { label: "Transactions Processed", value: 1317, sub: "" },
  { label: "Matched", value: 1248, sub: "" },
  { label: "Exceptions Detected", value: 69, sub: "" },
  { label: "AI Resolved", value: 35, sub: "" },
  { label: "Human Review", value: 21, sub: "" },
  { label: "Escalated", value: 13, sub: "" },
];

const PRIORITY_ACTIONS = [
  {
    id: "pa1",
    level: "high",
    title: "₹2.5L customer payment is overdue",
    sub: "Prioritize collection follow-up",
    action: "Review",
  },
  {
    id: "pa2",
    level: "medium",
    title: "Possible duplicate payment detected",
    sub: "TechSource Pvt Ltd · ₹48,000",
    action: "Investigate",
  },
  {
    id: "pa3",
    level: "low",
    title: "6 high-confidence transactions ready for auto-approval",
    sub: "No conflicts detected across sources",
    action: "Review All",
  },
];

const SOURCES = [
  { name: "Bank Statements", icon: Landmark, records: 1317, status: "Connected" },
  { name: "Invoices", icon: Receipt, records: 1284, status: "Connected" },
  { name: "Ledger / ERP", icon: Database, records: 1305, status: "Connected" },
];

const VENDORS = ["ABC Technologies", "TechSource Pvt Ltd", "Nimbus Logistics", "Orion Traders", "Vertex Supplies", "Kalyan Textiles", "BrightPath Consulting", "Prime Components"];

function makeTransactions() {
  const statuses = ["Matched", "Matched", "Matched", "Partial Match", "Unmatched", "AI Review"];
  const rows = [];
  for (let i = 0; i < 14; i++) {
    const bank = 8000 + Math.round(Math.random() * 42000);
    const diff = [0, 0, 0, 500, 1200, -800, 0][i % 7];
    const status = statuses[i % statuses.length];
    const confidence = status === "Matched" ? 96 + Math.floor(Math.random() * 4)
      : status === "Partial Match" ? 80 + Math.floor(Math.random() * 14)
      : status === "AI Review" ? 55 + Math.floor(Math.random() * 20)
      : 20 + Math.floor(Math.random() * 25);
    rows.push({
      id: `TXN-${1030 + i}`,
      date: `Aug ${20 + (i % 9)}, 2026`,
      vendor: VENDORS[i % VENDORS.length],
      bankAmount: bank,
      invoiceAmount: bank + diff,
      status,
      confidence,
    });
  }
  return rows;
}
const TRANSACTIONS = makeTransactions();

const EXCEPTION_DETAIL_1042 = {
  id: "TXN-1042",
  status: "Partial Payment Detected",
  bank: 10000,
  invoice: 10500,
  invoiceId: "INV-342",
  diff: 500,
  why: "The vendor name and payment date strongly match Invoice INV-342. The ₹500 difference indicates a likely partial payment rather than an unrelated transaction.",
  evidence: [
    { label: "Vendor Match", value: 98, kind: "percent" },
    { label: "Date Proximity", value: "1 Day", kind: "text" },
    { label: "Amount Similarity", value: 95.2, kind: "percent" },
    { label: "Historical Pattern", value: "Similar partial payments detected previously", kind: "text" },
  ],
  recommendation: "Mark ₹500 as outstanding and link this payment to Invoice INV-342.",
  confidence: 94,
  reasoning: [
    "Matched vendor name against invoice ledger with 98% string similarity.",
    "Compared payment date to invoice issue date — 1 day proximity, within normal settlement window.",
    "Computed amount delta of ₹500 against invoice total — below the partial-payment threshold of 5%.",
    "Cross-checked vendor's last 6 months of payment history for similar partial-payment patterns.",
    "Aggregated signals into a weighted confidence score of 94%, routed to human approval per policy.",
  ],
};

const EXCEPTIONS = [
  {
    id: "TXN-1098",
    risk: "high",
    vendor: "TechSource Pvt Ltd",
    amount: 48000,
    type: "Duplicate Payment Suspected",
    explanation: "A payment with the same vendor and amount was detected twice within 3 hours.",
    evidence: ["Same vendor", "Same amount", "Same invoice reference"],
    recommendation: "Hold payment and investigate duplicate transaction.",
    confidence: 97,
    resolvable: false,
  },
  {
    id: "TXN-1042",
    risk: "medium",
    vendor: "ABC Technologies",
    amount: 10000,
    type: "Partial Payment Detected",
    explanation: "Vendor and date strongly match Invoice INV-342; ₹500 shortfall suggests a partial settlement.",
    evidence: ["Vendor match 98%", "Date proximity 1 day", "Amount delta ₹500"],
    recommendation: "Mark ₹500 as outstanding and link to Invoice INV-342.",
    confidence: 94,
    resolvable: true,
  },
  {
    id: "TXN-1071",
    risk: "medium",
    vendor: "Nimbus Logistics",
    amount: 22400,
    type: "Invoice Format Mismatch",
    explanation: "Invoice number format changed after Aug 15, breaking the standard matching pattern.",
    evidence: ["New numbering scheme detected", "Vendor confirmed match 91%", "Amount exact match"],
    recommendation: "Auto-map new invoice format and reconcile.",
    confidence: 88,
    resolvable: true,
  },
  {
    id: "TXN-1103",
    risk: "low",
    vendor: "Vertex Supplies",
    amount: 6200,
    type: "Currency Rounding Difference",
    explanation: "Bank and invoice amounts differ by ₹2, consistent with standard rounding.",
    evidence: ["Amount delta < 0.1%", "Vendor exact match", "Date exact match"],
    recommendation: "Auto-resolve as rounding variance.",
    confidence: 99,
    resolvable: true,
  },
  {
    id: "TXN-1116",
    risk: "high",
    vendor: "Orion Traders",
    amount: 135000,
    type: "Unrecognized Vendor Pattern",
    explanation: "Payment does not match any known vendor banking details on file.",
    evidence: ["No vendor match found", "New bank account number", "High transaction value"],
    recommendation: "Escalate for manual fraud review.",
    confidence: 42,
    resolvable: false,
  },
  {
    id: "TXN-1128",
    risk: "low",
    vendor: "Kalyan Textiles",
    amount: 9800,
    type: "Late Invoice Upload",
    explanation: "Matching invoice was uploaded 4 days after the bank transaction cleared.",
    evidence: ["Vendor exact match", "Amount exact match", "Invoice uploaded late"],
    recommendation: "Auto-resolve now that invoice is available.",
    confidence: 96,
    resolvable: true,
  },
];

const INSIGHTS = [
  {
    id: "in1",
    kind: "root-cause",
    title: "Vendor-related invoice mismatches increased by 42% this month.",
    body: "8 out of 12 recent mismatches are related to Vendor ABC.",
    cause: "Invoice numbering format changed after Aug 15.",
    confidence: 89,
  },
  {
    id: "in2",
    kind: "cash",
    title: "Cash collection delay detected",
    body: "Expected collection delay may affect cash position next week.",
    confidence: 82,
  },
  {
    id: "in3",
    kind: "duplicate",
    title: "Duplicate risk",
    body: "3 unusual repeated payments detected across two vendors.",
    confidence: 91,
  },
  {
    id: "in4",
    kind: "data-quality",
    title: "Data quality issue",
    body: "14 transactions contain inconsistent vendor names across bank and ledger sources.",
    confidence: 76,
  },
];

const INSIGHT_FEED = [
  { time: "09:14 AM", text: "AI flagged a new duplicate-payment pattern for TechSource Pvt Ltd." },
  { time: "08:52 AM", text: "Vendor ABC invoice format change confirmed as root cause of 8 mismatches." },
  { time: "Yesterday", text: "Cash forecast updated — Sept 18 shortfall risk identified." },
  { time: "Yesterday", text: "14 vendor-name inconsistencies detected across ledger sync." },
  { time: "2 days ago", text: "Auto-resolved 12 rounding-variance exceptions under policy threshold." },
];

function makeCashForecast() {
  const days = [];
  let actual = 2480000;
  for (let i = -14; i <= 30; i++) {
    const isFuture = i > 0;
    if (!isFuture) actual += (Math.random() - 0.45) * 60000;
    let forecast = null;
    if (i >= -1) {
      const base = 2480000 - (i > 0 ? i * 21000 : 0);
      const dip = i === 19 ? -620000 : i > 19 && i < 24 ? -300000 : 0;
      forecast = base + dip + (Math.random() - 0.5) * 20000;
    }
    days.push({
      idx: i,
      label: i === 0 ? "Today" : i < 0 ? `D${i}` : `D+${i}`,
      actual: !isFuture ? Math.round(actual) : null,
      forecast: forecast !== null ? Math.round(forecast) : null,
    });
  }
  return days;
}
const CASH_FORECAST = makeCashForecast();

const AUDIT_LOG = [
  {
    id: "a1", time: "10:42 AM", txn: "TXN-1042", decision: "Partial Payment Identified",
    reason: "Vendor and date matched; ₹500 amount difference detected.",
    confidence: 94, status: "Awaiting Approval",
    original: "Bank: ABC Technologies ₹10,000 · Aug 28, 2026",
    evidence: "Vendor match 98%, date proximity 1 day, amount similarity 95.2%",
    recommendation: "Mark ₹500 as outstanding and link to Invoice INV-342.",
    finalAction: "Pending human review",
  },
  {
    id: "a2", time: "10:31 AM", txn: "TXN-1098", decision: "Duplicate Payment Suspected",
    reason: "Same vendor, amount, and invoice reference within 3 hours.",
    confidence: 97, status: "Escalated",
    original: "Bank: TechSource Pvt Ltd ₹48,000 ×2 · Aug 28, 2026",
    evidence: "Same vendor, same amount, same invoice reference",
    recommendation: "Hold payment and investigate duplicate transaction.",
    finalAction: "Escalated to Finance Controller",
  },
  {
    id: "a3", time: "09:58 AM", txn: "TXN-1103", decision: "Rounding Variance Auto-Resolved",
    reason: "₹2 delta below auto-resolve threshold of 0.1%.",
    confidence: 99, status: "Resolved",
    original: "Bank: Vertex Supplies ₹6,200 · Aug 27, 2026",
    evidence: "Amount delta < 0.1%, vendor & date exact match",
    recommendation: "Auto-resolve as rounding variance.",
    finalAction: "Auto-resolved by AI Controller",
  },
  {
    id: "a4", time: "09:20 AM", txn: "TXN-1128", decision: "Late Invoice Match Resolved",
    reason: "Matching invoice uploaded after bank transaction cleared.",
    confidence: 96, status: "Resolved",
    original: "Bank: Kalyan Textiles ₹9,800 · Aug 24, 2026",
    evidence: "Vendor & amount exact match, invoice uploaded 4 days late",
    recommendation: "Auto-resolve now that invoice is available.",
    finalAction: "Auto-resolved by AI Controller",
  },
  {
    id: "a5", time: "08:47 AM", txn: "TXN-1116", decision: "Unrecognized Vendor Pattern",
    reason: "No known vendor banking details matched this payment.",
    confidence: 42, status: "Escalated",
    original: "Bank: Unknown / Orion Traders ₹1,35,000 · Aug 27, 2026",
    evidence: "No vendor match, new account number, high value",
    recommendation: "Escalate for manual fraud review.",
    finalAction: "Escalated to Finance Controller",
  },
];

/* ============================================================================
   PRIMITIVES
============================================================================ */
function Card({ children, className = "", ...rest }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: C.surface, borderColor: C.border }}
      {...rest}
    >
      {children}
    </div>
  );
}

function Mono({ children, className = "" }) {
  return <span className={`font-mono ${className}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const map = {
    Matched: { bg: C.successBg, fg: C.success, icon: FileCheck2 },
    "Partial Match": { bg: C.warningBg, fg: C.warning, icon: FileWarning },
    Unmatched: { bg: C.dangerBg, fg: C.danger, icon: FileX2 },
    "AI Review": { bg: "#1B1A2B", fg: "#9C93D8", icon: Brain },
  };
  const cfg = map[status] || map.Matched;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon size={12} /> {status}
    </span>
  );
}

function RiskBadge({ level }) {
  const map = {
    high: { bg: C.dangerBg, fg: C.danger, label: "HIGH RISK" },
    medium: { bg: C.warningBg, fg: C.warning, label: "MEDIUM RISK" },
    low: { bg: C.successBg, fg: C.success, label: "LOW RISK" },
  };
  const cfg = map[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wider"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <ShieldAlert size={12} /> {cfg.label}
    </span>
  );
}

function ConfidenceRing({ value, size = 56, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 90 ? C.success : value >= 70 ? C.gold : C.danger;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.borderSoft} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-sm font-semibold" style={{ color: C.textPrimary }}>{value}%</span>
      </div>
    </div>
  );
}

function ConfidenceBar({ value, width = 64 }) {
  const color = value >= 90 ? C.success : value >= 70 ? C.gold : C.danger;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ width, background: C.borderSoft }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <Mono className="text-xs" style={{ color: C.textSecondary }}>{value}%</Mono>
    </div>
  );
}

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
      style={
        active
          ? { background: C.gold, color: "#161208" }
          : { background: "transparent", color: C.textSecondary, border: `1px solid ${C.border}` }
      }
    >
      {children}
    </button>
  );
}

function Tooltip2({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] shadow-xl"
          style={{ background: C.surface3, color: C.textPrimary, border: `1px solid ${C.border}` }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function Button({ children, variant = "ghost", className = "", ...rest }) {
  const styles = {
    primary: { background: C.gold, color: "#161208" },
    danger: { background: C.danger, color: "#fff" },
    outline: { background: "transparent", color: C.textPrimary, border: `1px solid ${C.border}` },
    ghost: { background: C.surface2, color: C.textPrimary },
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-85 ${className}`}
      style={styles[variant]}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ============================================================================
   SIDEBAR
============================================================================ */
const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "reconciliation", label: "Reconciliation", icon: GitCompare },
  { key: "exceptions", label: "Exceptions", icon: AlertTriangle },
  { key: "insights", label: "AI Insights", icon: Sparkles },
  { key: "forecast", label: "Cash Forecast", icon: TrendingUp },
  { key: "audit", label: "Audit Trail", icon: ClipboardList },
];

function Sidebar({ page, setPage, mobileOpen, setMobileOpen }) {
  const content = (
    <div className="flex h-full flex-col" style={{ background: C.surface, borderRight: `1px solid ${C.border}` }}>
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: C.gold }}>
            <Zap size={16} color="#161208" />
          </div>
          <span className="text-base font-semibold" style={{ color: C.textPrimary }}>FinSight AI</span>
        </div>
        <div className="mt-2 text-[10px] font-semibold tracking-[0.14em]" style={{ color: C.textMuted }}>
          AUTONOMOUS FINANCE CONTROLLER
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = page === item.key || (page === "exception-detail" && item.key === "exceptions");
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => { setPage(item.key); setMobileOpen(false); }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
              style={{
                background: active ? C.surface3 : "transparent",
                color: active ? C.gold : C.textSecondary,
              }}
            >
              <Icon size={17} />
              <span className="font-medium">{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: C.gold }} />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-3 space-y-1" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <button className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm" style={{ color: C.textSecondary }}>
          <Settings size={17} /> Settings
        </button>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm" style={{ color: C.textSecondary }}>
          <HelpCircle size={17} /> Help Center
        </button>
      </div>

      <div className="m-3 flex items-center gap-3 rounded-xl p-3" style={{ background: C.surface2 }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: C.goldDim }}>
          <UserCircle2 size={20} color={C.gold} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium" style={{ color: C.textPrimary }}>Finance Team</div>
          <div className="truncate text-xs" style={{ color: C.textMuted }}>Controller</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:h-screen md:sticky md:top-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">{content}</div>
        </div>
      )}
    </>
  );
}

/* ============================================================================
   HEADER
============================================================================ */
function Header({ title, subtitle, setMobileOpen, onUpload }) {
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-6 pb-5 md:px-8">
      <div className="flex items-start gap-3">
        <button className="mt-1 md:hidden" onClick={() => setMobileOpen(true)} style={{ color: C.textSecondary }}>
          <Menu size={22} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" style={{ color: C.textPrimary }}>{title}</h1>
          <p className="mt-1 text-sm" style={{ color: C.textSecondary }}>{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: C.surface2, color: C.textSecondary, border: `1px solid ${C.border}` }}>
          <CalendarDays size={14} /> Last 7 days <ChevronDown size={14} />
        </div>
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: C.surface2, color: C.textSecondary, border: `1px solid ${C.border}` }}
          >
            <Bell size={16} />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full text-[9px] flex items-center justify-center font-bold" style={{ background: C.danger, color: "#fff" }}>3</span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl p-2 shadow-2xl z-40" style={{ background: C.surface3, border: `1px solid ${C.border}` }}>
              {[
                { t: "High-risk exception flagged", s: "TXN-1116 · Orion Traders", time: "8m ago" },
                { t: "Cash shortage risk on Sept 18", s: "Forecast confidence 91%", time: "1h ago" },
                { t: "12 exceptions auto-resolved", s: "Rounding variance policy", time: "3h ago" },
              ].map((n, i) => (
                <div key={i} className="rounded-lg px-3 py-2.5 hover:opacity-90" style={{ borderBottom: i < 2 ? `1px solid ${C.borderSoft}` : "none" }}>
                  <div className="text-sm font-medium" style={{ color: C.textPrimary }}>{n.t}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{n.s}</div>
                  <div className="text-[10px] mt-1" style={{ color: C.textMuted }}>{n.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: C.goldDim }}>
          <UserCircle2 size={20} color={C.gold} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   METRIC CARDS
============================================================================ */
function MetricCard({ label, value, sub, trend, children }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: C.textMuted }}>{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <Mono className="text-2xl font-semibold" style={{ color: C.textPrimary }}>{value}</Mono>
        {children}
      </div>
      {sub && <div className="mt-2 text-xs" style={{ color: C.textSecondary }}>{sub}</div>}
      {trend !== undefined && (
        <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: trend >= 0 ? C.success : C.danger }}>
          {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {Math.abs(trend)}%
        </div>
      )}
    </Card>
  );
}

function FinanceScoreCard({ score, trend }) {
  const r = 42, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: C.textMuted }}>Finance Control Score</div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
          <svg width={96} height={96} className="-rotate-90">
            <circle cx={48} cy={48} r={r} fill="none" stroke={C.borderSoft} strokeWidth={8} />
            <circle cx={48} cy={48} r={r} fill="none" stroke={C.gold} strokeWidth={8} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Mono className="text-xl font-bold" style={{ color: C.textPrimary }}>{score}</Mono>
            <span className="text-[10px]" style={{ color: C.textMuted }}>/ 100</span>
          </div>
        </div>
        <div>
          <span className="inline-block rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: C.successBg, color: C.success }}>Good</span>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: C.success }}>
            <ArrowUpRight size={13} /> +{trend}%
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================================
   PAGE 1 — OVERVIEW
============================================================================ */
function OverviewPage({ goExceptionDetail, setPage }) {
  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <FinanceScoreCard score={KPIS.controlScore} trend={KPIS.controlTrend} />
        <MetricCard label="Reconciliation Match Rate" value={`${KPIS.matchRate}%`} sub={`${KPIS.matchedCount.toLocaleString("en-IN")} of ${KPIS.totalCount.toLocaleString("en-IN")} transactions matched`} />
        <MetricCard label="Open Exceptions" value={KPIS.openExceptions.total}>
          <div className="flex gap-1.5 text-[10px] font-mono mb-1">
            <span style={{ color: C.danger }}>{KPIS.openExceptions.high}H</span>
            <span style={{ color: C.warning }}>{KPIS.openExceptions.medium}M</span>
            <span style={{ color: C.success }}>{KPIS.openExceptions.low}L</span>
          </div>
        </MetricCard>
        <MetricCard label="Cash Position" value={inr(KPIS.cashPosition, { compact: true })} sub={`${inr(KPIS.cashTrend, { compact: true, showSign: true })} vs previous period`} trend={13} />
        <MetricCard label="AI Actions" value={KPIS.aiActions.total} sub={`${KPIS.aiActions.autoResolved} auto-resolved · ${KPIS.aiActions.awaitingApproval} awaiting approval`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Reconciliation Performance</h3>
            <span className="text-xs" style={{ color: C.textMuted }}>Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={RECON_PERF} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.gold} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="day" stroke={C.textMuted} tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
              <YAxis domain={[88, 96]} stroke={C.textMuted} tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: C.surface3, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} labelStyle={{ color: C.textSecondary }} />
              <Area type="monotone" dataKey="rate" stroke={C.gold} strokeWidth={2} fill="url(#goldFill)" name="Match Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="xl:col-span-2 p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: C.textPrimary }}>AI Controller Status</h3>
          <div className="space-y-0">
            {WORKFLOW_STEPS.map((s, i) => (
              <div key={s.label}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs" style={{ color: C.textSecondary }}>{s.label}</span>
                  <Mono className="text-sm font-semibold" style={{ color: C.textPrimary }}>{s.value.toLocaleString("en-IN")}</Mono>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="flex justify-center"><ChevronDown size={13} style={{ color: C.textMuted }} /></div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>AI Priority Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRIORITY_ACTIONS.map((a) => {
            const cfg = { high: { c: C.danger, bg: C.dangerBg }, medium: { c: C.warning, bg: C.warningBg }, low: { c: C.success, bg: C.successBg } }[a.level];
            return (
              <Card key={a.id} className="p-5 flex flex-col" style={{ borderColor: a.level === "high" ? C.danger + "55" : C.border }}>
                <span className="inline-flex self-start items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold tracking-wider mb-3" style={{ background: cfg.bg, color: cfg.c }}>
                  {a.level.toUpperCase()} PRIORITY
                </span>
                <p className="text-sm font-medium flex-1" style={{ color: C.textPrimary }}>{a.title}</p>
                <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>{a.sub}</p>
                <Button
                  variant={a.level === "high" ? "primary" : "outline"}
                  className="mt-4 w-full"
                  onClick={() => (a.id === "pa2" ? setPage("exceptions") : a.id === "pa1" ? setPage("exceptions") : setPage("exceptions"))}
                >
                  {a.action} <ChevronRight size={14} />
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PAGE 2 — RECONCILIATION
============================================================================ */
function ReconciliationPage({ onUpload, onOpenTxn }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Matched", "Partial Match", "Unmatched", "AI Review"];

  const rows = useMemo(() => {
    let r = TRANSACTIONS.filter((t) => filter === "All" || t.status === filter);
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (typeof av === "number") return (av - bv) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      });
    }
    return r;
  }, [filter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(1); }
  };

  const totalUnmatched = TRANSACTIONS.filter((t) => t.status === "Unmatched").length;
  const totalPartial = TRANSACTIONS.filter((t) => t.status === "Partial Match").length;

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {filters.map((f) => <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onUpload}><Upload size={15} /> Upload Data</Button>
          <Button variant="primary"><Zap size={15} /> Run Reconciliation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SOURCES.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.name} className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: C.surface2 }}>
                <Icon size={20} color={C.gold} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: C.textPrimary }}>{s.name}</div>
                <Mono className="text-xs" style={{ color: C.textSecondary }}>{s.records.toLocaleString("en-IN")} Records</Mono>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: C.success }}>
                <CircleDot size={10} /> {s.status}
              </span>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ["Total Transactions", KPIS.totalCount, C.textPrimary],
          ["Matched", KPIS.matchedCount, C.success],
          ["Partial Match", totalPartial, C.warning],
          ["Unmatched", totalUnmatched, C.danger],
        ].map(([label, val, color]) => (
          <Card key={label} className="p-4">
            <div className="text-xs" style={{ color: C.textMuted }}>{label}</div>
            <Mono className="text-lg font-semibold mt-1" style={{ color }}>{val.toLocaleString("en-IN")}</Mono>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  ["id", "Transaction ID"], ["date", "Date"], ["vendor", "Vendor"],
                  ["bankAmount", "Bank Amount"], ["invoiceAmount", "Invoice Amount"],
                  ["status", "Status"], ["confidence", "Match Confidence"], [null, "Action"],
                ].map(([key, label]) => (
                  <th key={label} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide whitespace-nowrap" style={{ color: C.textMuted }}>
                    {key ? (
                      <button className="inline-flex items-center gap-1 hover:opacity-80" onClick={() => toggleSort(key)}>
                        {label} <ArrowUpDown size={11} />
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer hover:opacity-90"
                  style={{ borderBottom: `1px solid ${C.borderSoft}` }}
                  onClick={() => onOpenTxn(t)}
                >
                  <td className="px-4 py-3"><Mono className="text-xs font-medium" style={{ color: C.gold }}>{t.id}</Mono></td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.textSecondary }}>{t.date}</td>
                  <td className="px-4 py-3" style={{ color: C.textPrimary }}>{t.vendor}</td>
                  <td className="px-4 py-3"><Mono style={{ color: C.textPrimary }}>{inr(t.bankAmount)}</Mono></td>
                  <td className="px-4 py-3"><Mono style={{ color: C.textPrimary }}>{inr(t.invoiceAmount)}</Mono></td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3"><ConfidenceBar value={t.confidence} /></td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-medium inline-flex items-center gap-1" style={{ color: C.gold }} onClick={(e) => { e.stopPropagation(); onOpenTxn(t); }}>
                      View <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TransactionDrawer({ txn, onClose, onOpenAnalysis }) {
  if (!txn) return null;
  const invoiceGuess = txn.invoiceAmount;
  const diff = Math.abs(txn.invoiceAmount - txn.bankAmount);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto p-6" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs" style={{ color: C.textMuted }}>Transaction</div>
            <Mono className="text-lg font-semibold" style={{ color: C.textPrimary }}>{txn.id}</Mono>
          </div>
          <button onClick={onClose} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>BANK DATA</div>
            <div className="space-y-1.5 text-sm">
              <Row label="Vendor" value={txn.vendor} />
              <Row label="Amount" value={inr(txn.bankAmount)} mono />
              <Row label="Date" value={txn.date} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>POSSIBLE INVOICE</div>
            <div className="space-y-1.5 text-sm">
              <Row label="Invoice" value="INV-342" />
              <Row label="Amount" value={inr(invoiceGuess)} mono />
              <Row label="Date" value={txn.date} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>MATCH ANALYSIS</div>
            <div className="space-y-1.5 text-sm">
              <Row label="Vendor similarity" value="98%" mono />
              <Row label="Date proximity" value="1 day" />
              <Row label="Amount difference" value={inr(diff)} mono />
            </div>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: C.textMuted }}>OVERALL AI CONFIDENCE</span>
            <ConfidenceRing value={txn.confidence} size={52} />
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2">
          <Button variant="primary" onClick={onOpenAnalysis}><Brain size={15} /> View AI Analysis</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost"><Check size={15} /> Approve Match</Button>
            <Button variant="outline"><X size={15} /> Reject</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: C.textSecondary }}>{label}</span>
      {mono ? <Mono style={{ color: C.textPrimary }}>{value}</Mono> : <span style={{ color: C.textPrimary }}>{value}</span>}
    </div>
  );
}

/* ============================================================================
   PAGE 3 — EXCEPTIONS
============================================================================ */
function ExceptionCard({ exc, onOpen }) {
  const borderColor = exc.risk === "high" ? C.danger + "50" : C.border;
  return (
    <Card className="p-5" style={{ borderColor }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <RiskBadge level={exc.risk} />
        <ConfidenceRing value={exc.confidence} size={44} stroke={5} />
      </div>
      <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>{exc.type}</h4>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <Mono style={{ color: C.gold }}>{exc.id}</Mono>
        <span style={{ color: C.textMuted }}>·</span>
        <span style={{ color: C.textSecondary }}>{exc.vendor}</span>
        <span style={{ color: C.textMuted }}>·</span>
        <Mono style={{ color: C.textPrimary }}>{inr(exc.amount)}</Mono>
      </div>

      <div className="mt-3 rounded-lg p-3 text-xs leading-relaxed" style={{ background: C.surface2, color: C.textSecondary }}>
        <span className="font-semibold" style={{ color: C.textMuted }}>AI Analysis: </span>“{exc.explanation}”
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {exc.evidence.map((e) => (
          <span key={e} className="rounded-md px-2 py-1 text-[10px]" style={{ background: C.surface2, color: C.textSecondary }}>• {e}</span>
        ))}
      </div>

      <div className="mt-3 text-xs" style={{ color: C.textSecondary }}>
        <span className="font-semibold" style={{ color: C.textMuted }}>AI Recommendation: </span>{exc.recommendation}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onOpen(exc)}>Investigate</Button>
        <Button variant={exc.resolvable ? "primary" : "danger"} className="flex-1" onClick={() => onOpen(exc)}>
          {exc.resolvable ? "Approve AI Action" : "Escalate"}
        </Button>
      </div>
    </Card>
  );
}

function ExceptionsPage({ onOpenException }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "High Risk", "Medium Risk", "Low Risk", "AI Resolvable", "Human Review"];

  const rows = EXCEPTIONS.filter((e) => {
    if (filter === "All") return true;
    if (filter === "High Risk") return e.risk === "high";
    if (filter === "Medium Risk") return e.risk === "medium";
    if (filter === "Low Risk") return e.risk === "low";
    if (filter === "AI Resolvable") return e.resolvable;
    if (filter === "Human Review") return !e.resolvable;
    return true;
  });

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((exc) => <ExceptionCard key={exc.id} exc={exc} onOpen={onOpenException} />)}
      </div>
      {rows.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm" style={{ color: C.textSecondary }}>No exceptions match this filter.</p>
        </Card>
      )}
    </div>
  );
}

/* ============================================================================
   PAGE 4 — AI EXCEPTION DETAIL (USP)
============================================================================ */
function PolicyLevel({ range, label, active, color }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: active ? color + "1a" : C.surface2, border: active ? `1px solid ${color}66` : `1px solid transparent` }}>
      <Mono className="text-xs" style={{ color: active ? color : C.textSecondary }}>{range}</Mono>
      <span className="text-xs font-medium" style={{ color: active ? color : C.textSecondary }}>{label}</span>
    </div>
  );
}

function ExceptionDetailPage({ txnId, onBack }) {
  const d = EXCEPTION_DETAIL_1042;
  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm" style={{ color: C.textSecondary }}>
        <ChevronLeft size={16} /> Back to Exceptions
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mono className="text-lg font-semibold" style={{ color: C.gold }}>{d.id}</Mono>
            <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: C.warningBg, color: C.warning }}>{d.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <Card className="p-6">
            <div className="grid grid-cols-3 items-center gap-2 text-center">
              <div>
                <div className="text-xs" style={{ color: C.textMuted }}>BANK PAYMENT</div>
                <Mono className="text-2xl font-bold mt-1" style={{ color: C.textPrimary }}>{inr(d.bank)}</Mono>
              </div>
              <div className="text-xs font-semibold" style={{ color: C.textMuted }}>VS</div>
              <div>
                <div className="text-xs" style={{ color: C.textMuted }}>INVOICE {d.invoiceId}</div>
                <Mono className="text-2xl font-bold mt-1" style={{ color: C.textPrimary }}>{inr(d.invoice)}</Mono>
              </div>
            </div>
            <div className="mt-4 text-center rounded-lg py-2" style={{ background: C.warningBg }}>
              <span className="text-xs font-semibold" style={{ color: C.warning }}>DIFFERENCE · {inr(d.diff)}</span>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: C.textPrimary }}>Why did this happen?</h3>
            <div className="rounded-lg p-4 text-sm leading-relaxed" style={{ background: C.surface2, color: C.textSecondary }}>
              <span className="font-semibold" style={{ color: C.textMuted }}>AI Analysis: </span>“{d.why}”
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>Evidence Used</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.evidence.map((e) => (
                <div key={e.label} className="rounded-lg p-3" style={{ background: C.surface2 }}>
                  <div className="text-xs" style={{ color: C.textMuted }}>{e.label}</div>
                  {e.kind === "percent" ? (
                    <Mono className="text-lg font-semibold mt-1" style={{ color: C.textPrimary }}>{e.value}%</Mono>
                  ) : (
                    <div className="text-sm font-medium mt-1" style={{ color: C.textPrimary }}>{e.value}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: C.textPrimary }}>AI Recommended Resolution</h3>
            <div className="rounded-lg p-4 text-sm" style={{ background: C.successBg, color: C.success }}>
              “{d.recommendation}”
            </div>

            <div className="mt-5 flex items-center gap-6">
              <ConfidenceRing value={d.confidence} size={80} stroke={7} />
              <div>
                <div className="text-xs" style={{ color: C.textMuted }}>Confidence Score</div>
                <div className="text-sm font-medium mt-1" style={{ color: C.warning }}>{d.confidence}% Confidence → Human Approval Required</div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <PolicyLevel range="95–100%" label="Auto Resolve" color={C.success} active={d.confidence >= 95} />
              <PolicyLevel range="70–94%" label="Human Approval" color={C.warning} active={d.confidence >= 70 && d.confidence < 95} />
              <PolicyLevel range="Below 70%" label="Manual Investigation" color={C.danger} active={d.confidence < 70} />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Button variant="primary"><Check size={15} /> Approve</Button>
              <Button variant="outline"><X size={15} /> Reject</Button>
              <Button variant="danger"><ShieldAlert size={15} /> Escalate</Button>
            </div>
          </Card>
        </div>

        <Card className="p-6 h-fit xl:sticky xl:top-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} color={C.gold} />
            <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>AI Reasoning Summary</h3>
          </div>
          <div className="space-y-4">
            {d.reasoning.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: C.goldDim, color: C.gold }}>{i + 1}</div>
                  {i < d.reasoning.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: C.border }} />}
                </div>
                <p className="text-xs leading-relaxed pb-3" style={{ color: C.textSecondary }}>{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================================
   PAGE 5 — AI INSIGHTS
============================================================================ */
const INSIGHT_ICON = { "root-cause": Sparkles, cash: TrendingUp, duplicate: AlertCircle, "data-quality": Info };

function InsightCard({ insight }) {
  const Icon = INSIGHT_ICON[insight.kind] || Sparkles;
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: C.goldDim }}>
          <Icon size={17} color={C.gold} />
        </div>
        <div className="flex-1 min-w-0">
          {insight.kind === "root-cause" && <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: C.gold }}>ROOT CAUSE DETECTED</div>}
          <h4 className="text-sm font-semibold" style={{ color: C.textPrimary }}>{insight.title}</h4>
          <p className="text-xs mt-1.5" style={{ color: C.textSecondary }}>{insight.body}</p>
          {insight.cause && (
            <div className="mt-2 text-xs rounded-lg p-2.5" style={{ background: C.surface2, color: C.textSecondary }}>
              <span className="font-semibold" style={{ color: C.textMuted }}>Possible root cause: </span>{insight.cause}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <ConfidenceBar value={insight.confidence} width={90} />
            <button className="text-xs font-medium inline-flex items-center gap-1" style={{ color: C.gold }}>
              Explore Pattern <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InsightsPage() {
  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INSIGHTS.map((i) => <InsightCard key={i.id} insight={i} />)}
      </div>
      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-4" style={{ color: C.textPrimary }}>Insight Activity Feed</h3>
        <div className="space-y-0">
          {INSIGHT_FEED.map((f, i) => (
            <div key={i} className="flex gap-3 py-3" style={{ borderBottom: i < INSIGHT_FEED.length - 1 ? `1px solid ${C.borderSoft}` : "none" }}>
              <div className="flex flex-col items-center pt-0.5">
                <div className="h-2 w-2 rounded-full" style={{ background: C.gold }} />
                {i < INSIGHT_FEED.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: C.borderSoft }} />}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-sm" style={{ color: C.textPrimary }}>{f.text}</p>
                <span className="text-xs" style={{ color: C.textMuted }}>{f.time}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   PAGE 6 — CASH FORECAST
============================================================================ */
function CashForecastPage() {
  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Current Cash Position" value={inr(2480000, { compact: true })} />
        <MetricCard label="Projected 30-Day Cash" value={inr(1840000, { compact: true })} trend={-25.8} />
        <MetricCard label="Lowest Expected Balance" value={inr(920000, { compact: true })} sub="Around Sept 18–22" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>30-Day Cash Intelligence</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5" style={{ color: C.textSecondary }}><span className="h-2 w-2 rounded-full inline-block" style={{ background: C.gold }} /> Actual</span>
            <span className="inline-flex items-center gap-1.5" style={{ color: C.textSecondary }}><span className="h-2 w-2 rounded-full inline-block" style={{ background: "#7C8FA6" }} /> Forecast</span>
            <span className="inline-flex items-center gap-1.5" style={{ color: C.textSecondary }}><span className="h-2 w-2 rounded-full inline-block" style={{ background: C.danger }} /> Risk Zone</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={CASH_FORECAST} margin={{ left: -10, right: 10 }}>
            <defs>
              <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.gold} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" stroke={C.textMuted} tick={{ fontSize: 10, fill: C.textMuted }} axisLine={false} tickLine={false} interval={4} />
            <YAxis stroke={C.textMuted} tick={{ fontSize: 10, fill: C.textMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => inr(v, { compact: true })} />
            <Tooltip contentStyle={{ background: C.surface3, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => inr(v, { compact: true })} />
            <ReferenceArea x1="D+17" x2="D+22" fill={C.danger} fillOpacity={0.1} />
            <ReferenceLine x="Today" stroke={C.textMuted} strokeDasharray="3 3" />
            <Area type="monotone" dataKey="actual" stroke={C.gold} strokeWidth={2.5} fill="url(#actualFill)" connectNulls name="Actual" />
            <Area type="monotone" dataKey="forecast" stroke="#7C8FA6" strokeWidth={2} strokeDasharray="5 4" fill="transparent" connectNulls name="Forecast" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6" style={{ borderColor: C.warning + "55" }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: C.warningBg }}>
              <AlertTriangle size={18} color={C.warning} />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: C.warning }}>SEPTEMBER 18 · CASH SHORTAGE RISK</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mt-1">
                <span style={{ color: C.textSecondary }}>Expected outgoing: <Mono style={{ color: C.textPrimary }}>{inr(620000, { compact: true })}</Mono></span>
                <span style={{ color: C.textSecondary }}>Expected incoming: <Mono style={{ color: C.textPrimary }}>{inr(280000, { compact: true })}</Mono></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs" style={{ color: C.textMuted }}>Risk Level</div>
              <div className="text-sm font-semibold" style={{ color: C.warning }}>Medium</div>
            </div>
            <ConfidenceRing value={91} size={56} />
          </div>
        </div>
        <div className="mt-4 rounded-lg p-4 text-sm" style={{ background: C.surface2, color: C.textSecondary }}>
          <span className="font-semibold" style={{ color: C.textMuted }}>AI Recommendation: </span>
          “Prioritize ₹3.4L of overdue customer collections to maintain the minimum cash threshold.”
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   PAGE 7 — AUDIT TRAIL
============================================================================ */
function AuditTrailPage({ onOpen }) {
  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Time", "Transaction", "AI Decision", "Reason", "Confidence", "Action Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: C.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOG.map((a) => {
                const statusColor = a.status === "Resolved" ? C.success : a.status === "Escalated" ? C.danger : C.warning;
                return (
                  <tr key={a.id} className="cursor-pointer hover:opacity-90" style={{ borderBottom: `1px solid ${C.borderSoft}` }} onClick={() => onOpen(a)}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.textSecondary }}><Clock size={12} className="inline mr-1.5 -mt-0.5" />{a.time}</td>
                    <td className="px-4 py-3"><Mono style={{ color: C.gold }}>{a.txn}</Mono></td>
                    <td className="px-4 py-3" style={{ color: C.textPrimary }}>{a.decision}</td>
                    <td className="px-4 py-3 max-w-xs" style={{ color: C.textSecondary }}>{a.reason}</td>
                    <td className="px-4 py-3"><ConfidenceBar value={a.confidence} width={56} /></td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: statusColor + "22", color: statusColor }}>{a.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AuditDetailModal({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Card className="relative w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Mono className="text-sm" style={{ color: C.gold }}>{record.txn}</Mono>
            <h3 className="text-lg font-semibold mt-0.5" style={{ color: C.textPrimary }}>{record.decision}</h3>
          </div>
          <button onClick={onClose} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>
        <div className="space-y-3 text-sm">
          <DetailRow label="Original Data" value={record.original} />
          <DetailRow label="Evidence" value={record.evidence} />
          <DetailRow label="Recommended Action" value={record.recommendation} />
          <DetailRow label="Final Human Action" value={record.finalAction} />
          <DetailRow label="Timestamp" value={record.time} />
          <div className="flex items-center justify-between rounded-lg p-3 mt-2" style={{ background: C.surface2 }}>
            <span className="text-xs font-semibold" style={{ color: C.textMuted }}>CONFIDENCE</span>
            <ConfidenceRing value={record.confidence} size={44} stroke={5} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-1" style={{ color: C.textMuted }}>{label.toUpperCase()}</div>
      <div className="rounded-lg p-3 text-sm" style={{ background: C.surface2, color: C.textSecondary }}>{value}</div>
    </div>
  );
}

/* ============================================================================
   UPLOAD MODAL
============================================================================ */
function UploadModal({ open, onClose }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Upload Data</h3>
          <button onClick={onClose} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>

        {!uploaded ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setUploaded(true); }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl py-10 text-center"
              style={{ border: `1.5px dashed ${dragOver ? C.gold : C.border}`, background: dragOver ? C.surface2 : "transparent" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: C.goldDim }}>
                <Upload size={20} color={C.gold} />
              </div>
              <p className="text-sm font-medium" style={{ color: C.textPrimary }}>Drag & drop your file here</p>
              <p className="text-xs" style={{ color: C.textMuted }}>Bank statements, invoices, or ledger exports · CSV, XLSX, PDF</p>
              <Button variant="outline" onClick={() => setUploaded(true)}>Browse Files</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Bank Statement", "Invoice Batch", "Ledger Export"].map((t) => (
                <span key={t} className="rounded-full px-3 py-1 text-xs" style={{ background: C.surface2, color: C.textSecondary }}>{t}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 size={40} color={C.success} />
            <p className="text-sm font-medium" style={{ color: C.textPrimary }}>File received — queued for reconciliation</p>
            <p className="text-xs" style={{ color: C.textMuted }}>bank_statement_aug2026.csv · 1,317 rows detected</p>
            <Button variant="primary" onClick={onClose} className="mt-2">Done</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
   APP SHELL
============================================================================ */
export default function App() {
  const [page, setPage] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeTxn, setActiveTxn] = useState(null);
  const [activeAudit, setActiveAudit] = useState(null);
  const [detailTxnId, setDetailTxnId] = useState(null);

  const titles = {
    overview: ["Good morning, Finance Team", "Here's what needs your attention today."],
    reconciliation: ["Smart Reconciliation", "AI-powered matching across your financial data sources."],
    exceptions: ["Exception Intelligence", "AI detects, explains, and prioritizes financial exceptions."],
    "exception-detail": ["AI Resolution Analysis", "Explainable reasoning behind every AI decision."],
    insights: ["AI Finance Insights", "Patterns and risks discovered across your finance operations."],
    forecast: ["Cash Intelligence", "Forecast your cash position and identify upcoming risks."],
    audit: ["Explainable AI Audit Trail", "Every AI decision is traceable, explainable, and reviewable."],
  };
  const [title, subtitle] = titles[page];

  return (
    <div className="flex min-h-screen w-full" style={{ background: C.bg, fontFamily: "'Inter', ui-sans-serif, system-ui" }}>
      <style>{`${FONT_IMPORT}
        * { box-sizing: border-box; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        button:focus-visible, a:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
      `}</style>

      <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 min-w-0">
        <Header title={title} subtitle={subtitle} setMobileOpen={setMobileOpen} onUpload={() => setUploadOpen(true)} />

        {page === "overview" && <OverviewPage setPage={setPage} />}
        {page === "reconciliation" && <ReconciliationPage onUpload={() => setUploadOpen(true)} onOpenTxn={setActiveTxn} />}
        {page === "exceptions" && (
          <ExceptionsPage
            onOpenException={(exc) => { setDetailTxnId(exc.id); setPage("exception-detail"); }}
          />
        )}
        {page === "exception-detail" && (
          <ExceptionDetailPage txnId={detailTxnId} onBack={() => setPage("exceptions")} />
        )}
        {page === "insights" && <InsightsPage />}
        {page === "forecast" && <CashForecastPage />}
        {page === "audit" && <AuditTrailPage onOpen={setActiveAudit} />}
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <TransactionDrawer
        txn={activeTxn}
        onClose={() => setActiveTxn(null)}
        onOpenAnalysis={() => { setActiveTxn(null); setDetailTxnId("TXN-1042"); setPage("exception-detail"); }}
      />
      <AuditDetailModal record={activeAudit} onClose={() => setActiveAudit(null)} />
    </div>
  );
}
