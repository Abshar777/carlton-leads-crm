"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall, XCircle, Timer, Coffee, RefreshCw, Filter, ShieldAlert,
  PhoneOff, CheckCircle2, PencilLine, AlertTriangle, Users,
} from "lucide-react";
import { useCallOverview, type CallOverviewRow, type CallOverviewPerUser } from "@/hooks/useCallAutomation";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/lib/store/authStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_VARIANTS = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };
const ITEM_VARIANTS = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

function formatIST(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** Seconds → "4m 12s" / "48s". */
function hold(seconds?: number | null) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

/** Live countdown to a break's end — recomputed every second by the caller. */
function remaining(endsAt?: string | null, now = Date.now()) {
  if (!endsAt) return "—";
  const left = Math.max(0, Math.round((new Date(endsAt).getTime() - now) / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, tone,
}: { icon: React.ElementType; label: string; value: number; tone: string }) {
  return (
    <motion.div variants={ITEM_VARIANTS} className="rounded-xl border border-border bg-card p-4">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function EmployeeCell({ row }: { row: CallOverviewRow }) {
  return (
    <td className="px-4 py-3">
      <div className="text-sm font-semibold">{row.user?.name ?? "—"}</div>
      <div className="text-xs text-muted-foreground">{row.user?.email}</div>
    </td>
  );
}

function LeadCell({ row }: { row: CallOverviewRow }) {
  if (!row.lead) return <td className="px-4 py-3 text-xs text-muted-foreground">—</td>;
  return (
    <td className="px-4 py-3">
      <Link href={`/leads/${row.lead._id}`} className="text-sm font-medium text-primary hover:underline">
        {row.lead.name}
      </Link>
      <div className="text-xs text-muted-foreground">{row.lead.phone}</div>
    </td>
  );
}

function TableShell({
  headers, empty, emptyIcon: EmptyIcon, isLoading, rows, children,
}: {
  headers: string[]; empty: string; emptyIcon: React.ElementType;
  isLoading: boolean; rows: number; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
          <EmptyIcon className="h-8 w-8 opacity-30" />
          <p className="text-sm">{empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>{headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "rejections" | "holds" | "breaks" | "employees";

export default function CallAutomationPage() {
  const { user } = useAuthStore();
  const role = user?.role as { isSystemRole?: boolean; roleName?: string } | undefined;
  const isSuperAdmin = !!role?.isSystemRole && role?.roleName === "Super Admin";

  const [activeTab, setActiveTab] = useState<Tab>("rejections");
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", userId: "" });
  // Break countdowns need their own tick — the query only refetches every 30s.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, isFetching, refetch } = useCallOverview({
    dateFrom: filters.dateFrom || undefined,
    dateTo:   filters.dateTo   || undefined,
    userId:   filters.userId   || undefined,
  });
  const { data: usersData } = useUsers({ limit: "200" });

  if (!isSuperAdmin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 text-destructive/50" />
        <p className="text-sm font-medium">Access restricted to Super Admin only.</p>
      </div>
    );
  }

  const counts = data?.counts ?? {};
  const rejections   = data?.rejections   ?? [];
  const flaggedHolds = data?.flaggedHolds ?? [];
  const activeBreaks = data?.activeBreaks ?? [];
  const perUser      = data?.perUser      ?? [];
  const hasFilter = !!(filters.dateFrom || filters.dateTo || filters.userId);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "rejections", label: "Rejections",   icon: XCircle, count: rejections.length },
    { id: "holds",      label: "Long Holds",   icon: Timer,   count: flaggedHolds.length },
    { id: "breaks",     label: "On Break",     icon: Coffee,  count: activeBreaks.length },
    { id: "employees",  label: "By Employee",  icon: Users,   count: perUser.length },
  ];

  return (
    <motion.div variants={PAGE_VARIANTS} initial="hidden" animate="visible" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <PhoneCall className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Call Automation</h1>
            <p className="text-sm text-muted-foreground">Rejections · Long holds · Breaks</p>
          </div>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <motion.div initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Calls Made"  value={counts.called   ?? 0} tone="bg-green-500/10 text-green-500" />
        <StatCard icon={PencilLine}   label="Lead Updates" value={counts.updated ?? 0} tone="bg-blue-500/10 text-blue-500" />
        <StatCard icon={XCircle}      label="Rejected"    value={counts.rejected ?? 0} tone="bg-red-500/10 text-red-500" />
        <StatCard icon={Coffee}       label="Breaks Taken" value={counts.break   ?? 0} tone="bg-amber-500/10 text-amber-500" />
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none" />
        <span className="text-sm text-muted-foreground">to</span>
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none" />
        <select value={filters.userId} onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
          className="max-w-[200px] rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none">
          <option value="">All employees</option>
          {(usersData?.data ?? []).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        {hasFilter && (
          <button onClick={() => setFilters({ dateFrom: "", dateTo: "", userId: "" })}
            className="text-xs text-muted-foreground underline hover:text-foreground">Clear</button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {hasFilter ? "Filtered" : "Today (IST)"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {activeTab === id && (
              <motion.div layoutId="call-tab-pill" className="absolute inset-0 rounded-lg bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" />{label}
              {count > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === id ? "bg-primary-foreground/20" : "bg-muted"
                  }`}>{count}</motion.span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}>

          {activeTab === "rejections" && (
            <TableShell isLoading={isLoading} rows={rejections.length}
              empty="No rejections in this period." emptyIcon={PhoneOff}
              headers={["Employee", "Lead", "Reason", "Held For", "Rejected At"]}>
              {rejections.map((r) => (
                <motion.tr key={r._id} variants={ITEM_VARIANTS} initial="hidden" animate="visible"
                  className="border-b border-border transition-colors hover:bg-muted/40">
                  <EmployeeCell row={r} />
                  <LeadCell row={r} />
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                      {r.rejectReason || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{hold(r.holdSeconds)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatIST(r.respondedAt)}</td>
                </motion.tr>
              ))}
            </TableShell>
          )}

          {activeTab === "holds" && (
            <TableShell isLoading={isLoading} rows={flaggedHolds.length}
              empty="Nobody held a prompt past their alert threshold." emptyIcon={Timer}
              headers={["Employee", "Lead", "Held For", "Outcome", "Prompted At"]}>
              {flaggedHolds.map((h) => (
                <motion.tr key={h._id} variants={ITEM_VARIANTS} initial="hidden" animate="visible"
                  className="border-b border-border transition-colors hover:bg-muted/40">
                  <EmployeeCell row={h} />
                  <LeadCell row={h} />
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-amber-500">
                      <Timer className="h-3 w-3" />{hold(h.holdSeconds)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{h.action ?? "open"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatIST(h.promptedAt)}</td>
                </motion.tr>
              ))}
            </TableShell>
          )}

          {activeTab === "breaks" && (
            <TableShell isLoading={isLoading} rows={activeBreaks.length}
              empty="Nobody is on a break right now." emptyIcon={Coffee}
              headers={["Employee", "Break Length", "Started", "Time Remaining"]}>
              {activeBreaks.map((b) => (
                <motion.tr key={b._id} variants={ITEM_VARIANTS} initial="hidden" animate="visible"
                  className="border-b border-border transition-colors hover:bg-muted/40">
                  <EmployeeCell row={b} />
                  <td className="px-4 py-3 text-sm">{b.breakMinutes ?? "—"} min</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatIST(b.respondedAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-amber-500">
                      <Coffee className="h-3 w-3" />{remaining(b.breakEndsAt, now)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </TableShell>
          )}

          {activeTab === "employees" && (
            <TableShell isLoading={isLoading} rows={perUser.length}
              empty="No call activity in this period." emptyIcon={Users}
              headers={["Employee", "Prompts", "Called", "Updated", "Rejected", "Breaks", "Avg Hold", "Max Hold"]}>
              {perUser.map((p: CallOverviewPerUser) => (
                <motion.tr key={p._id} variants={ITEM_VARIANTS} initial="hidden" animate="visible"
                  className="border-b border-border transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 text-sm font-semibold">{p.name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.total}</td>
                  <td className="px-4 py-3 text-sm text-green-500">{p.called}</td>
                  <td className="px-4 py-3 text-sm text-blue-500">{p.updated}</td>
                  <td className="px-4 py-3 text-sm text-red-400">{p.rejected}</td>
                  <td className="px-4 py-3 text-sm text-amber-500">{p.breaks}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{hold(p.avgHold != null ? Math.round(p.avgHold) : null)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{hold(p.maxHold)}</td>
                </motion.tr>
              ))}
            </TableShell>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Note */}
      <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          &quot;Long Holds&quot; uses each employee&apos;s own work schedule threshold
          (Hold Alert Minutes, default 10), not a single global number. With no date
          filter this page shows today in IST. Employees with no work schedule are
          never prompted, so they never appear here.
        </p>
      </div>
    </motion.div>
  );
}
