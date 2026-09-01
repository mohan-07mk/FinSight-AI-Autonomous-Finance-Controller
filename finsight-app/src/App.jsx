import React, { useState, useMemo, useRef, useEffect } from "react";
import AICopilot, { AnalyzeWithAIButton } from "./AICopilot";
import RiskRadarWidget from "./components/RiskRadarWidget";
import { ExplainableAIModal, ExplainableAIButton } from "./components/ExplainableAIModal";
import WhatIfSimulatorPage from "./components/WhatIfSimulatorPage";
import {
  Home, GitCompare, AlertTriangle, Sparkles, TrendingUp, ClipboardList,
  Settings, HelpCircle, Bell, Search, Upload, ChevronRight, ChevronDown,
  ChevronLeft, X, Check, ArrowUpRight, ArrowDownRight, Filter, ArrowUpDown,
  ShieldAlert, CheckCircle2, Clock, FileText, Menu, Brain, Zap, Link2,
  FileCheck2, FileWarning, FileX2, CircleDot, ChevronsRight, Info,
  CalendarDays, UserCircle2, XCircle, AlertCircle, Landmark, Receipt,
  Database, Eye, RotateCcw, Plus, Edit3, Trash2, Save, LifeBuoy,
  MessageSquare, FileQuestion, BookOpen, Send, Sliders, RefreshCw, Calculator
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
   DEFAULT MOCK DATA
============================================================================ */
const DEFAULT_KPIS = {
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

const SOURCES = [
  { name: "Bank Statements", icon: Landmark, records: 1317, status: "Connected" },
  { name: "Invoices", icon: Receipt, records: 1284, status: "Connected" },
  { name: "Ledger / ERP", icon: Database, records: 1305, status: "Connected" },
];

const VENDORS = ["ABC Technologies", "TechSource Pvt Ltd", "Nimbus Logistics", "Orion Traders", "Vertex Supplies", "Kalyan Textiles", "BrightPath Consulting", "Prime Components"];

function generateInitialTransactions() {
  const statuses = ["Matched", "Matched", "Matched", "Partial Match", "Unmatched", "AI Review"];
  const rows = [];
  for (let i = 0; i < 14; i++) {
    const bank = 8000 + (i * 3500) % 42000;
    const diff = [0, 0, 0, 500, 1200, -800, 0][i % 7];
    const status = statuses[i % statuses.length];
    const confidence = status === "Matched" ? 96 + (i % 4)
      : status === "Partial Match" ? 80 + (i % 14)
      : status === "AI Review" ? 55 + (i % 20)
      : 20 + (i % 25);
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

const DEFAULT_EXCEPTIONS = [
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

const DEFAULT_INSIGHTS = [
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
    if (!isFuture) actual += ((i % 3) - 1.2) * 20000;
    let forecast = null;
    if (i >= -1) {
      const base = 2480000 - (i > 0 ? i * 21000 : 0);
      const dip = i === 19 ? -620000 : i > 19 && i < 24 ? -300000 : 0;
      forecast = base + dip;
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

const DEFAULT_AUDIT_LOG = [
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
];

/* ============================================================================
   CSV PARSER UTILITY
============================================================================ */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  
  const vendorIdx = headers.findIndex((h) => h.includes("vendor") || h.includes("name") || h.includes("description") || h.includes("party") || h.includes("payee"));
  const bankIdx = headers.findIndex((h) => h.includes("bank") || h.includes("amount") || h.includes("debit") || h.includes("credit") || h.includes("val"));
  const invoiceIdx = headers.findIndex((h) => h.includes("invoice") || h.includes("expected") || h.includes("bill"));
  const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time") || h.includes("day"));
  const statusIdx = headers.findIndex((h) => h.includes("status"));

  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCells = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
    if (!rawCells || rawCells.length === 0) continue;
    const cleanCells = rawCells.map((cell) => cell.trim().replace(/^["']|["']$/g, ""));

    const vendor = (vendorIdx !== -1 && cleanCells[vendorIdx]) ? cleanCells[vendorIdx] : `Vendor ${i}`;
    const bankAmtStr = (bankIdx !== -1 && cleanCells[bankIdx]) ? cleanCells[bankIdx].replace(/[^0-9.-]/g, "") : "15000";
    const bankAmount = Math.abs(parseFloat(bankAmtStr) || 15000);

    const invAmtStr = (invoiceIdx !== -1 && cleanCells[invoiceIdx]) ? cleanCells[invoiceIdx].replace(/[^0-9.-]/g, "") : "";
    const invoiceAmount = invAmtStr ? Math.abs(parseFloat(invAmtStr)) : bankAmount;

    const date = (dateIdx !== -1 && cleanCells[dateIdx]) ? cleanCells[dateIdx] : `Aug ${10 + (i % 20)}, 2026`;

    let status = (statusIdx !== -1 && cleanCells[statusIdx]) ? cleanCells[statusIdx] : "";
    if (!status) {
      const diff = Math.abs(bankAmount - invoiceAmount);
      if (diff === 0) status = "Matched";
      else if (diff < 1000) status = "Partial Match";
      else status = "Unmatched";
    }

    const confidence = status === "Matched" ? 98 : status === "Partial Match" ? 85 : 40;

    parsed.push({
      id: `TXN-CSV-${1000 + i}`,
      date,
      vendor,
      bankAmount,
      invoiceAmount,
      status,
      confidence,
    });
  }
  return parsed;
}

/* ============================================================================
   PRIMITIVES
============================================================================ */
function Card({ children, className = "", style, ...rest }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: C.surface, borderColor: C.border, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

function Mono({ children, className = "", style, ...rest }) {
  return <span className={`font-mono ${className}`} style={style} {...rest}>{children}</span>;
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
  const cfg = map[level] || map.medium;
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
  { key: "simulator", label: "What-If Simulator", icon: Calculator },
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
        <button
          onClick={() => { setPage("settings"); setMobileOpen(false); }}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
          style={{
            background: page === "settings" ? C.surface3 : "transparent",
            color: page === "settings" ? C.gold : C.textSecondary,
          }}
        >
          <Settings size={17} /> Settings
        </button>
        <button
          onClick={() => { setPage("help"); setMobileOpen(false); }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
          style={{
            background: page === "help" ? C.surface3 : "transparent",
            color: page === "help" ? C.gold : C.textSecondary,
          }}
        >
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
function Header({ title, subtitle, setMobileOpen, onUpload, onResetData }) {
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
        <Button variant="ghost" onClick={onResetData} title="Reset All Data to Initial Defaults">
          <RotateCcw size={14} /> <span className="hidden sm:inline">Reset Data</span>
        </Button>
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
function OverviewPage({ transactions, exceptions, setPage }) {
  const totalCount = transactions.length;
  const matchedCount = transactions.filter((t) => t.status === "Matched").length;
  const matchRate = totalCount > 0 ? ((matchedCount / totalCount) * 100).toFixed(1) : 0;
  
  const highEx = exceptions.filter((e) => e.risk === "high").length;
  const medEx = exceptions.filter((e) => e.risk === "medium").length;
  const lowEx = exceptions.filter((e) => e.risk === "low").length;

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <RiskRadarWidget onNavigateToException={(id) => setPage("exceptions")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <FinanceScoreCard score={DEFAULT_KPIS.controlScore} trend={DEFAULT_KPIS.controlTrend} />
        <MetricCard label="Reconciliation Match Rate" value={`${matchRate}%`} sub={`${matchedCount} of ${totalCount} transactions matched`} />
        <MetricCard label="Open Exceptions" value={exceptions.length}>
          <div className="flex gap-1.5 text-[10px] font-mono mb-1">
            <span style={{ color: C.danger }}>{highEx}H</span>
            <span style={{ color: C.warning }}>{medEx}M</span>
            <span style={{ color: C.success }}>{lowEx}L</span>
          </div>
        </MetricCard>
        <MetricCard label="Cash Position" value={inr(DEFAULT_KPIS.cashPosition, { compact: true })} sub={`${inr(DEFAULT_KPIS.cashTrend, { compact: true, showSign: true })} vs previous period`} trend={13} />
        <MetricCard label="AI Actions" value={DEFAULT_KPIS.aiActions.total} sub={`${DEFAULT_KPIS.aiActions.autoResolved} auto-resolved · ${DEFAULT_KPIS.aiActions.awaitingApproval} awaiting approval`} />
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
            {[
              { label: "Data Sources", value: 3, sub: "connected" },
              { label: "Transactions Processed", value: totalCount, sub: "" },
              { label: "Matched", value: matchedCount, sub: "" },
              { label: "Exceptions Detected", value: exceptions.length, sub: "" },
              { label: "AI Resolved", value: 35, sub: "" },
              { label: "Human Review", value: 21, sub: "" },
            ].map((s, i) => (
              <div key={s.label}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs" style={{ color: C.textSecondary }}>{s.label}</span>
                  <Mono className="text-sm font-semibold" style={{ color: C.textPrimary }}>{s.value.toLocaleString("en-IN")}</Mono>
                </div>
                {i < 5 && (
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
          {[
            { id: "pa1", level: "high", title: "₹2.5L customer payment is overdue", sub: "Prioritize collection follow-up", action: "Review" },
            { id: "pa2", level: "medium", title: "Possible duplicate payment detected", sub: "TechSource Pvt Ltd · ₹48,000", action: "Investigate" },
            { id: "pa3", level: "low", title: "6 high-confidence transactions ready for auto-approval", sub: "No conflicts detected across sources", action: "Review All" },
          ].map((a) => {
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
                  onClick={() => setPage("exceptions")}
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
function ReconciliationPage({ transactions, onUpload, onOpenTxn, onEditTxn, onDeleteTxn, onAddTxn }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filters = ["All", "Matched", "Partial Match", "Unmatched", "AI Review"];

  const rows = useMemo(() => {
    let r = transactions.filter((t) => filter === "All" || t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((t) => t.id.toLowerCase().includes(q) || t.vendor.toLowerCase().includes(q) || t.date.toLowerCase().includes(q));
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (typeof av === "number") return (av - bv) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      });
    }
    return r;
  }, [transactions, filter, sortKey, sortDir, search]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(1); }
  };

  const totalUnmatched = transactions.filter((t) => t.status === "Unmatched").length;
  const totalPartial = transactions.filter((t) => t.status === "Partial Match").length;
  const totalMatched = transactions.filter((t) => t.status === "Matched").length;

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
            <Search size={14} style={{ color: C.textMuted }} />
            <input
              type="text" placeholder="Search by ID, vendor, date…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-xs w-36 sm:w-48"
              style={{ color: C.textPrimary }}
            />
            {search && <button onClick={() => setSearch('')} style={{ color: C.textMuted }}><X size={12} /></button>}
          </div>
          <Button variant="ghost" onClick={onAddTxn}><Plus size={15} /> Add Record</Button>
          <Button variant="outline" onClick={onUpload}><Upload size={15} /> Upload CSV</Button>
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
                <Mono className="text-xs" style={{ color: C.textSecondary }}>{transactions.length} Records</Mono>
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
          ["Total Transactions", transactions.length, C.textPrimary],
          ["Matched", totalMatched, C.success],
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
                  ["status", "Status"], ["confidence", "Match Confidence"], [null, "Actions"],
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1 rounded hover:bg-zinc-800" style={{ color: C.textSecondary }} title="Edit Record" onClick={() => onEditTxn(t)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="p-1 rounded hover:bg-zinc-800" style={{ color: C.danger }} title="Delete Record" onClick={() => onDeleteTxn(t.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
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

/* ============================================================================
   TRANSACTION DRAWER & EDIT MODALS
============================================================================ */
function TransactionDrawer({ txn, onClose, onOpenAnalysis }) {
  const [drawerAction, setDrawerAction] = useState(null);
  useEffect(() => { setDrawerAction(null); }, [txn]);
  if (!txn) return null;
  const diff = Math.abs(txn.invoiceAmount - txn.bankAmount);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto p-6" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs" style={{ color: C.textMuted }}>Transaction Details</div>
            <Mono className="text-lg font-semibold" style={{ color: C.textPrimary }}>{txn.id}</Mono>
          </div>
          <button onClick={onClose} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>BANK DATA</div>
            <div className="space-y-1.5 text-sm">
              <Row label="Vendor" value={txn.vendor} />
              <Row label="Bank Amount" value={inr(txn.bankAmount)} mono />
              <Row label="Date" value={txn.date} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>INVOICE DATA</div>
            <div className="space-y-1.5 text-sm">
              <Row label="Invoice Ref" value="INV-MATCH" />
              <Row label="Invoice Amount" value={inr(txn.invoiceAmount)} mono />
              <Row label="Status" value={txn.status} />
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
          <AnalyzeWithAIButton recordType="transaction" recordId={txn.id} />
          <div className="grid grid-cols-2 gap-2">
            {drawerAction ? (
              <div className="col-span-2 rounded-lg p-3 text-sm font-medium text-center" style={{ background: drawerAction === 'approved' ? C.successBg : C.dangerBg, color: drawerAction === 'approved' ? C.success : C.danger }}>
                {drawerAction === 'approved' ? '✓ Match Approved' : '✗ Match Rejected'}
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setDrawerAction('approved')}><Check size={15} /> Approve Match</Button>
                <Button variant="outline" onClick={() => setDrawerAction('rejected')}><X size={15} /> Reject</Button>
              </>
            )}
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

function EditTxnModal({ txn, onClose, onSave }) {
  const [vendor, setVendor] = useState(txn?.vendor || "");
  const [bankAmount, setBankAmount] = useState(txn?.bankAmount || 0);
  const [invoiceAmount, setInvoiceAmount] = useState(txn?.invoiceAmount || 0);
  const [status, setStatus] = useState(txn?.status || "Matched");
  const [confidence, setConfidence] = useState(txn?.confidence || 95);
  const [date, setDate] = useState(txn?.date || "");

  useEffect(() => {
    if (txn) {
      setVendor(txn.vendor);
      setBankAmount(txn.bankAmount);
      setInvoiceAmount(txn.invoiceAmount);
      setStatus(txn.status);
      setConfidence(txn.confidence);
      setDate(txn.date);
    }
  }, [txn]);

  if (!txn) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...txn,
      vendor,
      bankAmount: parseFloat(bankAmount),
      invoiceAmount: parseFloat(invoiceAmount),
      status,
      confidence: parseInt(confidence, 10),
      date,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Edit Transaction {txn.id}</h3>
          <button onClick={onClose} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Vendor Name</label>
            <input
              type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Bank Amount (₹)</label>
              <input
                type="number" value={bankAmount} onChange={(e) => setBankAmount(e.target.value)} required
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Invoice Amount (₹)</label>
              <input
                type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} required
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Status</label>
              <select
                value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              >
                <option value="Matched">Matched</option>
                <option value="Partial Match">Partial Match</option>
                <option value="Unmatched">Unmatched</option>
                <option value="AI Review">AI Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Confidence (%)</label>
              <input
                type="number" min="0" max="100" value={confidence} onChange={(e) => setConfidence(e.target.value)} required
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Transaction Date</label>
            <input
              type="text" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-3">
            <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1"><Save size={15} /> Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function AddTxnModal({ open, onClose, onAdd }) {
  const [vendor, setVendor] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [status, setStatus] = useState("Matched");
  const [date, setDate] = useState("Aug 30, 2026");

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const bank = parseFloat(bankAmount) || 0;
    const inv = parseFloat(invoiceAmount) || bank;
    const conf = status === "Matched" ? 98 : status === "Partial Match" ? 85 : 45;
    onAdd({
      id: `TXN-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
      vendor: vendor || "Custom Vendor",
      bankAmount: bank,
      invoiceAmount: inv,
      status,
      confidence: conf,
      date: date || "Aug 30, 2026",
    });
    setVendor("");
    setBankAmount("");
    setInvoiceAmount("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Add New Financial Record</h3>
          <button onClick={onClose} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Vendor / Party Name</label>
            <input
              type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} required placeholder="e.g. Acme Corp"
              className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Bank Amount (₹)</label>
              <input
                type="number" value={bankAmount} onChange={(e) => setBankAmount(e.target.value)} required placeholder="25000"
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Invoice Amount (₹)</label>
              <input
                type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="25000"
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Status</label>
              <select
                value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              >
                <option value="Matched">Matched</option>
                <option value="Partial Match">Partial Match</option>
                <option value="Unmatched">Unmatched</option>
                <option value="AI Review">AI Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Date</label>
              <input
                type="text" value={date} onChange={(e) => setDate(e.target.value)} required
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1"><Plus size={15} /> Add Record</Button>
          </div>
        </form>
      </Card>
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
      <div className="mt-2">
        <AnalyzeWithAIButton recordType="exception" recordId={exc.id} />
      </div>
    </Card>
  );
}

function ExceptionsPage({ exceptions, onOpenException }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "High Risk", "Medium Risk", "Low Risk", "AI Resolvable", "Human Review"];

  const rows = exceptions.filter((e) => {
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
   PAGE 4 — AI EXCEPTION DETAIL
============================================================================ */
function ExceptionDetailPage({ txnId, onBack }) {
  const [loading, setLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [actionState, setActionState] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAiAnalysis() {
      if (!txnId) return;
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/ai/analyze-exception/${txnId}`, { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setAiReport(json.data);
          }
        }
      } catch (err) {
        // Fallback to static mock data if server offline
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAiAnalysis();
    return () => { isMounted = false; };
  }, [txnId]);

  const d = useMemo(() => {
    if (aiReport) {
      return {
        id: txnId || "TXN-1042",
        status: aiReport.requires_human_review ? "Human Review Needed" : "AI Analyzed",
        bank: 10000,
        invoice: 10500,
        invoiceId: "INV-342",
        diff: 500,
        why: aiReport.what_happened || "Vendor and payment match invoice INV-342 with ₹500 partial variance.",
        evidence: aiReport.evidence_analysed && aiReport.evidence_analysed.length > 0 
          ? aiReport.evidence_analysed.map((item, idx) => ({ label: `Signal ${idx + 1}`, value: item, kind: 'text' }))
          : DEFAULT_EXCEPTIONS[1].evidence.map(e => ({ label: 'Signal', value: e, kind: 'text' })),
        recommendation: aiReport.ai_recommendation || DEFAULT_EXCEPTIONS[1].recommendation,
        confidence: Math.round((aiReport.ai_confidence || 0.94) * 100),
        reasoning: aiReport.evidence_analysed || ["Vendor string match > 95%", "Date proximity 1 day", "Delta below threshold"],
        aiModel: aiReport.ai_model || "gemini-3.6-flash",
        aiGenerated: true
      };
    }
    return {
      id: txnId || "TXN-1042",
      status: "Partial Payment Detected",
      bank: 10000,
      invoice: 10500,
      invoiceId: "INV-342",
      diff: 500,
      why: "The vendor name and payment date strongly match Invoice INV-342. The ₹500 difference indicates a likely partial payment.",
      evidence: [
        { label: "Vendor Match", value: 98, kind: "percent" },
        { label: "Date Proximity", value: "1 Day", kind: "text" },
        { label: "Amount Similarity", value: 95.2, kind: "percent" },
      ],
      recommendation: "Mark ₹500 as outstanding and link this payment to Invoice INV-342.",
      confidence: 94,
      reasoning: [
        "Matched vendor name against invoice ledger with 98% string similarity.",
        "Compared payment date to invoice issue date — 1 day proximity.",
        "Computed amount delta of ₹500 against invoice total.",
        "Aggregated signals into a weighted confidence score of 94%.",
      ],
      aiGenerated: false
    };
  }, [aiReport, txnId]);

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm" style={{ color: C.textSecondary }}>
          <ChevronLeft size={16} /> Back to Exceptions
        </button>
        {loading && (
          <span className="inline-flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40 animate-pulse">
            <Brain size={13} className="animate-spin" /> Gemini AI Analyzing Financial Evidence...
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mono className="text-lg font-semibold" style={{ color: C.gold }}>{d.id}</Mono>
            <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: C.warningBg, color: C.warning }}>{d.status}</span>
            {d.aiGenerated && (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                <Sparkles size={11} /> Gemini 3.6 Flash Verified
              </span>
            )}
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Why did this happen?</h3>
              <ExplainableAIButton recordType="exception" recordId={d.id} />
            </div>
            <div className="rounded-lg p-4 text-sm leading-relaxed" style={{ background: C.surface2, color: C.textSecondary }}>
              <span className="font-semibold" style={{ color: C.textMuted }}>AI Analysis: </span>“{d.why}”
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>Evidence Used</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {d.evidence.map((e, idx) => (
                <div key={idx} className="rounded-lg p-3" style={{ background: C.surface2 }}>
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

            <div className="mt-6 grid grid-cols-3 gap-2">
              {actionState ? (
                <div className="col-span-3 rounded-lg p-3 text-sm font-medium text-center" style={{ background: actionState === 'approved' ? C.successBg : actionState === 'rejected' ? C.dangerBg : C.warningBg, color: actionState === 'approved' ? C.success : actionState === 'rejected' ? C.danger : C.warning }}>
                  {actionState === 'approved' ? '✓ Approved — Resolution applied' : actionState === 'rejected' ? '✗ Rejected — Returned for review' : '⚠ Escalated — Sent to Finance Controller'}
                </div>
              ) : (
                <>
                  <Button variant="primary" onClick={() => setActionState('approved')}><Check size={15} /> Approve</Button>
                  <Button variant="outline" onClick={() => setActionState('rejected')}><X size={15} /> Reject</Button>
                  <Button variant="danger" onClick={() => setActionState('escalated')}><ShieldAlert size={15} /> Escalate</Button>
                </>
              )}
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

function InsightCard({ insight, onExplore }) {
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
            <button 
              onClick={() => onExplore && onExplore(insight)}
              className="text-xs font-medium inline-flex items-center gap-1 hover:underline cursor-pointer transition-opacity hover:opacity-80" 
              style={{ color: C.gold }}
            >
              Explore Pattern <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InsightsPage() {
  const [selectedInsight, setSelectedInsight] = useState(null);

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEFAULT_INSIGHTS.map((i) => (
          <InsightCard key={i.id} insight={i} onExplore={(insight) => setSelectedInsight(insight)} />
        ))}
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

      {selectedInsight && (
        <ExplainableAIModal
          isOpen={Boolean(selectedInsight)}
          onClose={() => setSelectedInsight(null)}
          recordType="insight"
          recordId={selectedInsight.id}
          data={{
            confirmed_evidence: [
              `Pattern occurrence rate evaluated at ${selectedInsight.confidence}% match confidence`,
              `Triggering condition: ${selectedInsight.title}`,
              selectedInsight.cause ? `Root Cause: ${selectedInsight.cause}` : "Cross-referenced across Bank, Invoice, and General Ledger"
            ],
            ai_interpretation: `${selectedInsight.title}. ${selectedInsight.body}`,
            recommended_action: "Audit itemized vendor billing records and re-verify invoice matching format rules.",
            uncertainties_limitations: "Analysis reflects recent 30-day transactional snapshot."
          }}
        />
      )}
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
function AuditTrailPage({ auditLogs, onOpen }) {
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
              {auditLogs.map((a) => {
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
   PAGE 8 — SETTINGS
============================================================================ */
function SettingsPage({ settings, setSettings, onResetData, onClearData }) {
  const [autoResolve, setAutoResolve] = useState(settings.autoResolveThreshold || 95);
  const [humanApproval, setHumanApproval] = useState(settings.humanApprovalThreshold || 70);
  const [companyName, setCompanyName] = useState(settings.companyName || "FinSight AI Corp");
  const [currency, setCurrency] = useState(settings.currency || "INR");
  const [model, setModel] = useState(settings.model || "gemini-3.6-flash");
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSettings({
      autoResolveThreshold: parseInt(autoResolve, 10),
      humanApprovalThreshold: parseInt(humanApproval, 10),
      companyName,
      currency,
      model,
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6 max-w-4xl">
      {savedMsg && (
        <div className="rounded-lg p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: C.textPrimary }}>
            <Sliders size={18} color={C.gold} /> AI Automation Rules & Thresholds
          </h3>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium" style={{ color: C.textPrimary }}>Auto-Resolve Confidence Threshold</label>
                <Mono className="text-sm font-bold" style={{ color: C.gold }}>{autoResolve}%</Mono>
              </div>
              <p className="text-xs mb-2" style={{ color: C.textSecondary }}>Transactions with confidence equal or higher than this percentage will be automatically approved by AI.</p>
              <input
                type="range" min="80" max="99" value={autoResolve} onChange={(e) => setAutoResolve(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium" style={{ color: C.textPrimary }}>Human Approval Required Threshold</label>
                <Mono className="text-sm font-bold" style={{ color: C.gold }}>{humanApproval}%</Mono>
              </div>
              <p className="text-xs mb-2" style={{ color: C.textSecondary }}>Transactions between this threshold and Auto-Resolve will be sent to human review.</p>
              <input
                type="range" min="50" max="85" value={humanApproval} onChange={(e) => setHumanApproval(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: C.textPrimary }}>
            <Settings size={18} color={C.gold} /> Company & Intelligence Engine
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Company / Organization Name</label>
              <input
                type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Base Currency</label>
              <select
                value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500 text-sm"
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>AI Model Engine</label>
              <select
                value={model} onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500 text-sm"
              >
                <option value="gemini-3.6-flash">Google Gemini 3.6 Flash (Recommended)</option>
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button variant="primary" type="submit"><Save size={15} /> Save Settings</Button>
          </div>
        </Card>
      </form>

      <Card className="p-6 border-red-900/50 bg-red-950/10">
        <h3 className="text-base font-semibold text-red-400 mb-2 flex items-center gap-2">
          <Trash2 size={18} /> Data Management & Reset Options
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Reset all transaction records, custom uploaded CSVs, and audit logs back to default demo state, or wipe data.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="danger" onClick={onResetData}>
            <RotateCcw size={15} /> Reset All Data to Initial Defaults
          </Button>
          <Button variant="outline" onClick={onClearData}>
            <Trash2 size={15} /> Clear All Transactions
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   PAGE 9 — HELP CENTER
============================================================================ */
function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");

  const faqs = [
    {
      q: "How does the AI matching algorithm work?",
      a: "FinSight AI uses 3-way reconciliation (Bank, Invoice, Ledger). It analyzes vendor string similarity, date proximity, and amount deltas to assign a confidence score between 0% and 100%.",
    },
    {
      q: "What file formats can I upload?",
      a: "You can upload Bank Statements, Invoice Ledgers, or General Ledger exports in CSV, XLSX, or plain text format. The system automatically parses columns for Date, Vendor, Amount, and Reference ID.",
    },
    {
      q: "What happens when an exception is flagged?",
      a: "If confidence is above your Auto-Resolve threshold (e.g. 95%), AI resolves it automatically. If between 70%-94%, it routes to Human Approval. Below 70%, it requires Manual Fraud Review.",
    },
    {
      q: "How do I reset or clear custom uploaded data?",
      a: "Go to Settings -> Data Management & Reset Options, or click the 'Reset Data' button in the top header bar.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) => f.q.toLowerCase().includes(query.toLowerCase()) || f.a.toLowerCase().includes(query.toLowerCase())
  );

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      setTicketSubject("");
      setTicketMessage("");
    }, 4000);
  };

  return (
    <div className="px-5 md:px-8 pb-10 space-y-6 max-w-4xl">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: C.goldDim }}>
            <LifeBuoy size={20} color={C.gold} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Search Help Documentation</h3>
            <p className="text-xs" style={{ color: C.textSecondary }}>Find answers to common questions about reconciliation and AI rules.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-zinc-900 border border-zinc-800">
          <Search size={16} style={{ color: C.textMuted }} />
          <input
            type="text" placeholder="Search FAQs (e.g. CSV upload, confidence score, reset data)..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent outline-none text-sm w-full text-white"
          />
          {query && <button onClick={() => setQuery("")}><X size={14} color={C.textMuted} /></button>}
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Frequently Asked Questions</h3>
        {filteredFaqs.map((f, i) => (
          <Card key={i} className="p-5">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: C.gold }}>
              <FileQuestion size={16} /> {f.q}
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>{f.a}</p>
          </Card>
        ))}
        {filteredFaqs.length === 0 && (
          <Card className="p-8 text-center text-sm text-zinc-400">No matching help articles found.</Card>
        )}
      </div>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-2 flex items-center gap-2" style={{ color: C.textPrimary }}>
          <MessageSquare size={18} color={C.gold} /> Contact Finance Support Team
        </h3>
        <p className="text-xs mb-4" style={{ color: C.textSecondary }}>Have a complex reconciliation question? Submit a ticket directly to your controller.</p>

        {ticketSent ? (
          <div className="rounded-lg p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> Ticket submitted! Support team will respond shortly.
          </div>
        ) : (
          <form onSubmit={handleTicketSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Subject</label>
              <input
                type="text" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} required placeholder="e.g. Bank CSV format issue"
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: C.textMuted }}>Message / Description</label>
              <textarea
                rows={3} value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} required placeholder="Describe what you need help with..."
                className="w-full rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-amber-500"
              />
            </div>
            <Button variant="primary" type="submit"><Send size={14} /> Submit Support Ticket</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
   UPLOAD MODAL
============================================================================ */
function UploadModal({ open, onClose, onDataParsed }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUploadedFileName("");
      setParsedCount(0);
    }
  }, [open]);

  if (!open) return null;

  const handleFile = (file) => {
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parsedRows = parseCSV(content);
      if (parsedRows.length > 0) {
        setParsedCount(parsedRows.length);
        onDataParsed(parsedRows, file.name);
      } else {
        alert("No valid rows found in file. Please ensure it is a CSV format with column headers.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: C.textPrimary }}>Upload Data Source</h3>
          <button onClick={onClose} style={{ color: C.textSecondary }}><X size={20} /></button>
        </div>

        <input
          type="file" accept=".csv,.txt" ref={fileInputRef} className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
          }}
        />

        {!uploadedFileName ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-xl py-10 text-center cursor-pointer hover:border-amber-500 transition-colors"
              style={{ border: `1.5px dashed ${dragOver ? C.gold : C.border}`, background: dragOver ? C.surface2 : "transparent" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: C.goldDim }}>
                <Upload size={20} color={C.gold} />
              </div>
              <p className="text-sm font-medium" style={{ color: C.textPrimary }}>Click or drag & drop CSV file here</p>
              <p className="text-xs" style={{ color: C.textMuted }}>Bank statements, invoices, or ledger exports (.csv, .txt)</p>
              <Button variant="outline" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse Files
              </Button>
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
            <p className="text-sm font-medium" style={{ color: C.textPrimary }}>CSV Parsed & Imported Successfully!</p>
            <p className="text-xs" style={{ color: C.textMuted }}>{uploadedFileName} · {parsedCount} records added to reconciliation</p>
            <Button variant="primary" onClick={onClose} className="mt-2">Done & View Reconciliation</Button>
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
  const [editingTxn, setEditingTxn] = useState(null);
  const [addTxnOpen, setAddTxnOpen] = useState(false);
  const [activeAudit, setActiveAudit] = useState(null);
  const [detailTxnId, setDetailTxnId] = useState(null);

  // Core State with LocalStorage persistence
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("finsight_transactions");
      return saved ? JSON.parse(saved) : generateInitialTransactions();
    } catch (e) {
      return generateInitialTransactions();
    }
  });

  const [exceptions, setExceptions] = useState(() => {
    try {
      const saved = localStorage.getItem("finsight_exceptions");
      return saved ? JSON.parse(saved) : DEFAULT_EXCEPTIONS;
    } catch (e) {
      return DEFAULT_EXCEPTIONS;
    }
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem("finsight_audit");
      return saved ? JSON.parse(saved) : DEFAULT_AUDIT_LOG;
    } catch (e) {
      return DEFAULT_AUDIT_LOG;
    }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("finsight_settings");
      return saved ? JSON.parse(saved) : {
        autoResolveThreshold: 95,
        humanApprovalThreshold: 70,
        companyName: "FinSight AI Corp",
        currency: "INR",
        model: "gemini-3.6-flash",
      };
    } catch (e) {
      return {
        autoResolveThreshold: 95,
        humanApprovalThreshold: 70,
        companyName: "FinSight AI Corp",
        currency: "INR",
        model: "gemini-3.6-flash",
      };
    }
  });

  useEffect(() => {
    try { localStorage.setItem("finsight_transactions", JSON.stringify(transactions)); } catch (e) {}
  }, [transactions]);

  useEffect(() => {
    try { localStorage.setItem("finsight_exceptions", JSON.stringify(exceptions)); } catch (e) {}
  }, [exceptions]);

  useEffect(() => {
    try { localStorage.setItem("finsight_audit", JSON.stringify(auditLogs)); } catch (e) {}
  }, [auditLogs]);

  useEffect(() => {
    try { localStorage.setItem("finsight_settings", JSON.stringify(settings)); } catch (e) {}
  }, [settings]);

  // Actions
  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset all data back to initial default values?")) {
      const initialTxns = generateInitialTransactions();
      setTransactions(initialTxns);
      setExceptions(DEFAULT_EXCEPTIONS);
      setAuditLogs(DEFAULT_AUDIT_LOG);
      localStorage.removeItem("finsight_transactions");
      localStorage.removeItem("finsight_exceptions");
      localStorage.removeItem("finsight_audit");
      alert("All data reset to initial default state!");
    }
  };

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all transaction records?")) {
      setTransactions([]);
      setExceptions([]);
      alert("All transactions cleared!");
    }
  };

  const handleCsvParsed = (newRows, fileName) => {
    setTransactions((prev) => [...newRows, ...prev]);
    
    // Add audit record
    const newAudit = {
      id: `a-${Date.now()}`,
      time: "Just Now",
      txn: `BATCH-${newRows.length}`,
      decision: `CSV Import: ${fileName}`,
      reason: `Uploaded ${newRows.length} transactions via CSV parser`,
      confidence: 98,
      status: "Resolved",
      original: `File: ${fileName} (${newRows.length} rows)`,
      evidence: "CSV schema validated and mapped automatically",
      recommendation: "Auto-reconciled matches appended to transaction ledger",
      finalAction: "Processed by AI CSV Importer",
    };
    setAuditLogs((prev) => [newAudit, ...prev]);
  };

  const handleSaveEditedTxn = (updatedTxn) => {
    setTransactions((prev) => prev.map((t) => (t.id === updatedTxn.id ? updatedTxn : t)));
  };

  const handleDeleteTxn = (id) => {
    if (window.confirm(`Delete transaction ${id}?`)) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleAddTxn = (newTxn) => {
    setTransactions((prev) => [newTxn, ...prev]);
  };

  const titles = {
    overview: [`Good morning, ${settings.companyName || "Finance Team"}`, "Here's what needs your attention today."],
    reconciliation: ["Smart Reconciliation", "AI-powered matching across your financial data sources."],
    exceptions: ["Exception Intelligence", "AI detects, explains, and prioritizes financial exceptions."],
    simulator: ["What-If Cash Flow Simulator", "Simulate cash delays & expense adjustments with 100% deterministic precision."],
    "exception-detail": ["AI Resolution Analysis", "Explainable reasoning behind every AI decision."],
    insights: ["AI Finance Insights", "Patterns and risks discovered across your finance operations."],
    forecast: ["Cash Intelligence", "Forecast your cash position and identify upcoming risks."],
    audit: ["Explainable AI Audit Trail", "Every AI decision is traceable, explainable, and reviewable."],
    settings: ["Controller Settings", "Configure AI automation rules, confidence thresholds, and system preferences."],
    help: ["Help & Support Center", "Search documentation, AI operation guides, or submit a support ticket."],
  };

  const [title, subtitle] = titles[page] || titles.overview;

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
        <Header
          title={title} subtitle={subtitle} setMobileOpen={setMobileOpen}
          onUpload={() => setUploadOpen(true)} onResetData={handleResetData}
        />

        {page === "overview" && <OverviewPage transactions={transactions} exceptions={exceptions} setPage={setPage} />}
        {page === "reconciliation" && (
          <ReconciliationPage
            transactions={transactions} onUpload={() => setUploadOpen(true)} onOpenTxn={setActiveTxn}
            onEditTxn={(t) => setEditingTxn(t)} onDeleteTxn={handleDeleteTxn} onAddTxn={() => setAddTxnOpen(true)}
          />
        )}
        {page === "exceptions" && (
          <ExceptionsPage
            exceptions={exceptions}
            onOpenException={(exc) => { setDetailTxnId(exc.id); setPage("exception-detail"); }}
          />
        )}
        {page === "simulator" && <WhatIfSimulatorPage />}
        {page === "exception-detail" && (
          <ExceptionDetailPage txnId={detailTxnId} onBack={() => setPage("exceptions")} />
        )}
        {page === "insights" && <InsightsPage />}
        {page === "forecast" && <CashForecastPage />}
        {page === "audit" && <AuditTrailPage auditLogs={auditLogs} onOpen={setActiveAudit} />}
        {page === "settings" && (
          <SettingsPage
            settings={settings} setSettings={setSettings}
            onResetData={handleResetData} onClearData={handleClearData}
          />
        )}
        {page === "help" && <HelpCenterPage />}
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onDataParsed={handleCsvParsed} />
      <EditTxnModal txn={editingTxn} onClose={() => setEditingTxn(null)} onSave={handleSaveEditedTxn} />
      <AddTxnModal open={addTxnOpen} onClose={() => setAddTxnOpen(false)} onAdd={handleAddTxn} />
      <TransactionDrawer
        txn={activeTxn}
        onClose={() => setActiveTxn(null)}
        onOpenAnalysis={() => { setActiveTxn(null); setDetailTxnId("TXN-1042"); setPage("exception-detail"); }}
      />
      <AuditDetailModal record={activeAudit} onClose={() => setActiveAudit(null)} />
      <AICopilot />
    </div>
  );
}
