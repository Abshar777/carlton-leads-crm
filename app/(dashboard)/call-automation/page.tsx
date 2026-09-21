"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall, XCircle, Timer, Coffee, RefreshCw, Filter, ShieldAlert,
  PhoneOff, CheckCircle2, PencilLine, AlertTriangle, Users, Users as UsersIcon,
  ClipboardList, ClipboardX, History, Clock, ChevronRight,
} from "lucide-react";
import {
  useCallOverview, CALL_RESULT_LABELS,
  type CallOverviewRow, type CallOverviewPerUser, type CallOverview,
} from "@/hooks/useCallAutomation";
import { useUsers } from "@/hooks/useUsers";
import { STATUS_LABELS, STATUS_COLORS, type LeadStatus } from "@/lib/leadStatus";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
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

function EmployeeCell({ row, onOpen }: { row: CallOverviewRow; onOpen?: (userId: string) => void }) {
  const id = String((row.user as { _id?: string } | null)?._id ?? "");
  return (
    <td className="px-4 py-3">
      <button
        type="button"
        disabled={!onOpen || !id}
        onClick={(e) => { e.stopPropagation(); if (id) onOpen?.(id); }}
        className="text-left enabled:hover:underline disabled:cursor-default"
      >
        <div className="text-sm font-semibold">{row.user?.name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{row.user?.email}</div>
      </button>
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

/** Just the clock time — the date is already fixed by the filter. */
function timeIST(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/**
 * Entered far off the measured time. Not necessarily wrong — they may have
 * taken a while to get back to their desk — but worth an admin's eye.
 */
function durationsDiverge(row: CallOverviewRow): boolean {
  const a = row.autoDurationSeconds;
  const m = row.callDurationSeconds;
  if (a == null || m == null) return false;
  return Math.abs(a - m) > Math.max(60, a * 0.5);
}

function LeadStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = STATUS_COLORS[status as LeadStatus] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {STATUS_LABELS[status as LeadStatus] ?? status}
    </span>
  );
}

function OutcomeBadge({ row }: { row: CallOverviewRow }) {
  const status = row.outcomeStatus ?? "none";
  const cfg: Record<string, { label: string; cls: string }> = {
    submitted: { label: "Filled in",     cls: "bg-green-500/10 text-green-500" },
    pending:   { label: "Awaiting",      cls: "bg-blue-500/10 text-blue-400" },
    skipped:   { label: "Not filled in", cls: "bg-orange-500/10 text-orange-400" },
    none:      { label: "—",             cls: "bg-muted text-muted-foreground" },
  };
  const c = cfg[status] ?? cfg.none;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${c.cls}`}>{c.label}</span>;
}

/** One call, expandable to show every time its details were entered or edited. */
function CallLogRow({ row, onOpen }: { row: CallOverviewRow; onOpen?: (userId: string) => void }) {
  const [open, setOpen] = useState(false);
  const history = row.outcomeHistory ?? [];
  const edits = Math.max(0, history.length - 1);

  return (
    <>
      <motion.tr variants={ITEM_VARIANTS} initial="hidden" animate="visible"
        className="border-b border-border transition-colors hover:bg-muted/40">
        <EmployeeCell row={row} onOpen={onOpen} />
        <LeadCell row={row} />
        <td className="px-4 py-3"><LeadStatusBadge status={row.lead?.status} /></td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
          {timeIST(row.callStartedAt)}
          {row.outcomeAt && <span className="block text-[11px] opacity-70">wrote up {timeIST(row.outcomeAt)}</span>}
        </td>
        <td className="px-4 py-3 text-xs">
          {row.callResult ? CALL_RESULT_LABELS[row.callResult] ?? row.callResult : "—"}
        </td>
        <td className="px-4 py-3 font-mono text-xs">
          {row.callDurationSeconds != null
            ? <span className="text-foreground">{hold(row.callDurationSeconds)}</span>
            : <span className="text-muted-foreground">—</span>}
          {row.autoDurationSeconds != null && (
            <span className={`block text-[11px] ${durationsDiverge(row) ? "text-orange-400" : "text-muted-foreground"}`}>
              auto {hold(row.autoDurationSeconds)}
            </span>
          )}
        </td>
        <td className="max-w-[260px] px-4 py-3 text-xs text-muted-foreground">
          {row.outcomeStatus === "skipped"
            ? <span className="text-orange-400">{row.outcomeSkipReason || "no reason given"}</span>
            : <span className="line-clamp-2">{row.callNote || "—"}</span>}
        </td>
        <td className="px-4 py-3"><OutcomeBadge row={row} /></td>
        <td className="px-4 py-3">
          {history.length > 0 && (
            <button onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <History className="h-3 w-3" />
              {history.length}{edits > 0 ? ` (${edits} edit${edits === 1 ? "" : "s"})` : ""}
            </button>
          )}
        </td>
      </motion.tr>

      <AnimatePresence initial={false}>
        {open && history.length > 0 && (
          <tr>
            <td colSpan={9} className="border-b border-border bg-muted/20 p-0">
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Every time these details were entered
                  </p>
                  {history.map((h, i) => {
                    const by = typeof h.recordedBy === "object" && h.recordedBy ? h.recordedBy.name : undefined;
                    return (
                      <div key={i} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {i === 0 ? "First entry" : `Edit ${i}`}
                          </span>
                          <span>{formatIST(h.recordedAt)}</span>
                          {by && <span>· by {by}</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3">
                          <span>{CALL_RESULT_LABELS[h.callResult] ?? h.callResult}</span>
                          <span className="font-mono">{hold(h.durationSeconds)}</span>
                          {h.autoDurationSeconds != null && (
                            <span className="font-mono text-muted-foreground">auto {hold(h.autoDurationSeconds)}</span>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground">{h.note}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

/** A labelled number in the detail sheet's summary strip. */
function MiniStat({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({
  title, count, children,
}: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
      </h3>
      {count === 0
        ? <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">Nothing in this period.</p>
        : children}
    </div>
  );
}

/**
 * Everything one employee did in the period the page is filtered to.
 *
 * Built from the rows already on the page rather than a second request, so it
 * always matches whatever filter is showing and opens instantly.
 */
function EmployeeDetailSheet({
  employee, data, rangeLabel, onClose,
}: {
  employee: CallOverviewPerUser | null;
  data?: CallOverview;
  rangeLabel: string;
  onClose: () => void;
}) {
  const id = employee?._id;
  const mine = <T extends CallOverviewRow>(rows: T[]) =>
    rows.filter((r) => String((r.user as { _id?: string } | null)?._id ?? r.user) === id);

  const calls      = mine(data?.callLog      ?? []);
  const rejections = mine(data?.rejections   ?? []);
  const holds      = mine(data?.flaggedHolds ?? []);
  const breaks     = mine(data?.breakLog     ?? []);

  return (
    <Sheet open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-primary" />
            {employee?.name ?? "Employee"}
          </SheetTitle>
          <SheetDescription>{rangeLabel}</SheetDescription>
        </SheetHeader>

        {employee && (
          <div className="mt-4 space-y-5">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <MiniStat label="Prompts"  value={employee.total} />
              <MiniStat label="Called"   value={employee.called}   tone="text-green-500" />
              <MiniStat label="Updated"  value={employee.updated}  tone="text-blue-500" />
              <MiniStat label="Rejected" value={employee.rejected} tone="text-red-400" />
              <MiniStat label="Breaks"   value={employee.breaks}   tone="text-amber-500" />
              <MiniStat label="Avg hold" value={hold(employee.avgHold != null ? Math.round(employee.avgHold) : null)} />
              <MiniStat label="Max hold" value={hold(employee.maxHold)} />
              <MiniStat label="Expired"  value={employee.expired} tone="text-muted-foreground" />
            </div>

            <Section title="Calls" count={calls.length}>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>{["Lead", "Called", "Result", "Duration", "Write-up"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {calls.map((c) => <SheetCallRow key={c._id} row={c} />)}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Rejections" count={rejections.length}>
              <div className="space-y-1.5">
                {rejections.map((r) => (
                  <div key={r._id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{r.lead?.name ?? "—"}</span>
                      <span className="text-muted-foreground">{formatIST(r.respondedAt)} · held {hold(r.holdSeconds)}</span>
                    </div>
                    <p className="mt-1 text-red-400">{r.rejectReason || "no reason given"}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Breaks" count={breaks.length}>
              <div className="space-y-1.5">
                {breaks.map((b) => (
                  <div key={b._id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {b.breakMinutes ?? "—"} min
                        {(b.breakExtensions ?? 0) > 0 && <span className="ml-1 text-amber-400">+{b.breakExtensions}&times; extended</span>}
                      </span>
                      <span className="text-muted-foreground">
                        {timeIST(b.respondedAt)} &rarr; due {timeIST(b.breakEndsAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground">
                      <span>back {timeIST(b.breakReturnedAt)}</span>
                      {b.breakOverrunSeconds != null && b.breakOverrunSeconds > 0 &&
                        <span className="text-orange-400">late by {hold(b.breakOverrunSeconds)}</span>}
                      {b.breakReturnHoldSeconds != null && <span>popup held {hold(b.breakReturnHoldSeconds)}</span>}
                      {!b.breakReturnedAt && b.breakReturnClosedAt && <span className="text-orange-400">never confirmed</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Long holds" count={holds.length}>
              <div className="space-y-1.5">
                {holds.map((h) => (
                  <div key={h._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-xs">
                    <span className="font-medium">{h.lead?.name ?? "—"}</span>
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <Timer className="h-3 w-3" />{hold(h.holdSeconds)} &middot; {h.action ?? "open"}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Compact call row for the sheet, expandable to the write-up history. */
function SheetCallRow({ row }: { row: CallOverviewRow }) {
  const [open, setOpen] = useState(false);
  const history = row.outcomeHistory ?? [];

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/40">
        <td className="px-3 py-2 text-xs font-medium">{row.lead?.name ?? "—"}</td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{timeIST(row.callStartedAt)}</td>
        <td className="px-3 py-2 text-xs">{row.callResult ? CALL_RESULT_LABELS[row.callResult] ?? row.callResult : "—"}</td>
        <td className="px-3 py-2 font-mono text-xs">
          {row.callDurationSeconds != null ? hold(row.callDurationSeconds) : "—"}
          {row.autoDurationSeconds != null && (
            <span className={`block text-[10px] ${durationsDiverge(row) ? "text-orange-400" : "text-muted-foreground"}`}>
              auto {hold(row.autoDurationSeconds)}
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5" disabled={!history.length}>
            <OutcomeBadge row={row} />
            {history.length > 0 && <History className="h-3 w-3 text-muted-foreground" />}
          </button>
        </td>
      </tr>
      {open && history.length > 0 && (
        <tr>
          <td colSpan={5} className="border-b border-border bg-muted/20 px-3 py-2">
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div key={i} className="text-[11px]">
                  <span className="font-semibold">{i === 0 ? "First entry" : `Edit ${i}`}</span>
                  <span className="text-muted-foreground"> · {formatIST(h.recordedAt)} · {CALL_RESULT_LABELS[h.callResult] ?? h.callResult} · {hold(h.durationSeconds)}{h.autoDurationSeconds != null ? ` (auto ${hold(h.autoDurationSeconds)})` : ""}</span>
                  <p className="text-muted-foreground">{h.note}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "calls" | "rejections" | "holds" | "breaks" | "employees";

export default function CallAutomationPage() {
  const { user } = useAuthStore();
  const role = user?.role as { isSystemRole?: boolean; roleName?: string } | undefined;
  const isSuperAdmin = !!role?.isSystemRole && role?.roleName === "Super Admin";

  const [activeTab, setActiveTab] = useState<Tab>("calls");
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", userId: "" });
  // Break countdowns need their own tick — the query only refetches every 30s.
  const [detail, setDetail] = useState<CallOverviewPerUser | null>(null);
  /** Opening from a call/rejection/break row, where only the user id is to hand. */
  const openEmployeeById = (userId: string) => {
    const row = (data?.perUser ?? []).find((p) => p._id === userId);
    if (row) setDetail(row);
  };
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
  const callLog        = data?.callLog        ?? [];
  const pendingOutcomes = data?.pendingOutcomes ?? [];
  const skippedOutcomes = data?.skippedOutcomes ?? [];
  const breakLog          = data?.breakLog          ?? [];
  const awaitingReturn    = data?.awaitingReturn    ?? [];
  const unconfirmedReturns = data?.unconfirmedReturns ?? [];
  const hasFilter = !!(filters.dateFrom || filters.dateTo || filters.userId);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "calls",      label: "Call Log",     icon: ClipboardList, count: callLog.length },
    { id: "rejections", label: "Rejections",   icon: XCircle, count: rejections.length },
    { id: "holds",      label: "Long Holds",   icon: Timer,   count: flaggedHolds.length },
    { id: "breaks",     label: "Breaks",       icon: Coffee,  count: breakLog.length },
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
            <p className="text-sm text-muted-foreground">Calls &middot; Write-ups &middot; Holds &middot; Breaks</p>
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
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={CheckCircle2} label="Calls Made"      value={counts.called ?? 0}          tone="bg-green-500/10 text-green-500" />
        <StatCard icon={Clock}        label="Write-up Pending" value={pendingOutcomes.length}      tone="bg-blue-500/10 text-blue-500" />
        <StatCard icon={ClipboardX}   label="Not Filled In"    value={skippedOutcomes.length}      tone="bg-orange-500/10 text-orange-500" />
        <StatCard icon={XCircle}      label="Rejected"         value={counts.rejected ?? 0}        tone="bg-red-500/10 text-red-500" />
        <StatCard icon={Coffee}       label="Back Yet?"        value={awaitingReturn.length}       tone="bg-amber-500/10 text-amber-500" />
        <StatCard icon={AlertTriangle} label="Never Confirmed" value={unconfirmedReturns.length}   tone="bg-orange-500/10 text-orange-400" />
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
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 sm:w-fit">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
              activeTab === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {activeTab === id && (
              <motion.div layoutId="call-tab-pill" className="absolute inset-0 rounded-lg bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
            <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
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

          {activeTab === "calls" && (
            <TableShell isLoading={isLoading} rows={callLog.length}
              empty="No calls placed in this period." emptyIcon={PhoneCall}
              headers={["Employee", "Lead", "Lead Status", "Called / Wrote Up", "Result", "Duration", "Notes", "Write-up", "History"]}>
              {callLog.map((c) => <CallLogRow key={c._id} row={c} onOpen={openEmployeeById} />)}
            </TableShell>
          )}

          {activeTab === "rejections" && (
            <TableShell isLoading={isLoading} rows={rejections.length}
              empty="No rejections in this period." emptyIcon={PhoneOff}
              headers={["Employee", "Lead", "Reason", "Held For", "Rejected At"]}>
              {rejections.map((r) => (
                <motion.tr key={r._id} variants={ITEM_VARIANTS} initial="hidden" animate="visible"
                  className="border-b border-border transition-colors hover:bg-muted/40">
                  <EmployeeCell row={r} onOpen={openEmployeeById} />
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
                  <EmployeeCell row={h} onOpen={openEmployeeById} />
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
            <TableShell isLoading={isLoading} rows={breakLog.length}
              empty="No breaks taken in this period." emptyIcon={Coffee}
              headers={["Employee", "Length", "Started", "Due Back", "Back At", "Late By", "Popup Held", "Status"]}>
              {breakLog.map((b) => {
                const live = !!b.breakEndsAt && new Date(b.breakEndsAt).getTime() > now;
                const asked = !!b.breakReturnPromptedAt && !b.breakReturnedAt && !b.breakReturnClosedAt;
                const status = live
                  ? { label: `On break · ${remaining(b.breakEndsAt, now)}`, cls: "bg-amber-500/10 text-amber-500" }
                  : asked
                    ? { label: "Asked, no answer", cls: "bg-blue-500/10 text-blue-400" }
                    : b.breakReturnedAt
                      ? { label: "Confirmed back", cls: "bg-green-500/10 text-green-500" }
                      : b.breakReturnClosedAt
                        ? { label: "Never confirmed", cls: "bg-orange-500/10 text-orange-400" }
                        : { label: "—", cls: "bg-muted text-muted-foreground" };

                return (
                  <motion.tr key={b._id} variants={ITEM_VARIANTS} initial="hidden" animate="visible"
                    className="border-b border-border transition-colors hover:bg-muted/40">
                    <EmployeeCell row={b} onOpen={openEmployeeById} />
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {b.breakMinutes ?? "—"} min
                      {(b.breakExtensions ?? 0) > 0 && (
                        <span className="ml-1 text-[11px] text-amber-400">+{b.breakExtensions}&times; extended</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{timeIST(b.respondedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{timeIST(b.breakEndsAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{timeIST(b.breakReturnedAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {b.breakOverrunSeconds != null && b.breakOverrunSeconds > 0
                        ? <span className="text-orange-400">{hold(b.breakOverrunSeconds)}</span>
                        : <span className="text-muted-foreground">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {b.breakReturnHoldSeconds != null ? hold(b.breakReturnHoldSeconds)
                        : asked && b.breakReturnPromptedAt
                          ? hold(Math.round((now - new Date(b.breakReturnPromptedAt).getTime()) / 1000))
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </TableShell>
          )}

          {activeTab === "employees" && (
            <TableShell isLoading={isLoading} rows={perUser.length}
              empty="No call activity in this period." emptyIcon={Users}
              headers={["Employee", "Prompts", "Called", "Updated", "Rejected", "Breaks", "Avg Hold", "Max Hold"]}>
              {perUser.map((p: CallOverviewPerUser) => (
                <motion.tr key={p._id} variants={ITEM_VARIANTS} initial="hidden" animate="visible"
                  onClick={() => setDetail(p)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(p); } }}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40 focus:bg-muted/60 focus:outline-none">
                  <td className="px-4 py-3 text-sm font-semibold">
                    <span className="flex items-center gap-1.5">
                      {p.name ?? "—"}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </td>
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

      <EmployeeDetailSheet
        employee={detail}
        data={data}
        rangeLabel={hasFilter ? "Filtered period" : "Today (IST)"}
        onClose={() => setDetail(null)}
      />

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
