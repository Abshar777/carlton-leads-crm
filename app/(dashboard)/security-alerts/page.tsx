"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Download, Copy, Printer, Camera, MessageCircle, Filter, RefreshCw, AlertTriangle } from "lucide-react";

function formatIST(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
import { useTrapEvents, useTrapSocket, type TrapAction, type TrapEvent } from "@/hooks/useTrapEvents";
import { useAuthStore } from "@/lib/store/authStore";

const ACTION_LABELS: Record<TrapAction, { label: string; icon: React.ElementType; color: string }> = {
  download_leads:      { label: "Download Attempt",  icon: Download,       color: "text-red-500 bg-red-500/10" },
  copy_phone:          { label: "Copy Phone",         icon: Copy,           color: "text-orange-500 bg-orange-500/10" },
  print_attempt:       { label: "Print Attempt",      icon: Printer,        color: "text-yellow-500 bg-yellow-500/10" },
  screenshot_attempt:  { label: "Screenshot",         icon: Camera,         color: "text-purple-500 bg-purple-500/10" },
  whatsapp_share:      { label: "WhatsApp Share",     icon: MessageCircle,  color: "text-green-500 bg-green-500/10" },
};

const PAGE_VARIANTS = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.07 } },
};
const ITEM_VARIANTS = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

function ActionBadge({ action }: { action: TrapAction }) {
  const cfg = ACTION_LABELS[action];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function TrapRow({ event, index }: { event: TrapEvent; index: number }) {
  const ua = event.userAgent ?? "";
  const device = ua.includes("Mobile") ? "Mobile" : ua.includes("Windows") ? "Windows" : ua.includes("Mac") ? "Mac" : "—";
  const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "—";

  return (
    <motion.tr
      variants={ITEM_VARIANTS}
      className="border-b border-border hover:bg-muted/40 transition-colors"
    >
      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{index + 1}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-foreground">{event.user?.name ?? "Unknown"}</div>
        <div className="text-xs text-muted-foreground">{event.user?.email ?? ""}</div>
      </td>
      <td className="px-4 py-3">
        <ActionBadge action={event.action} />
      </td>
      <td className="px-4 py-3">
        {event.leadId ? (
          <div>
            <div className="text-sm text-foreground">{(event.leadId as { name?: string }).name ?? event.leadName ?? "—"}</div>
            {event.phoneNumber && <div className="text-xs text-muted-foreground font-mono">{event.phoneNumber}</div>}
          </div>
        ) : event.phoneNumber ? (
          <div className="text-sm font-mono text-foreground">{event.phoneNumber}</div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-muted-foreground truncate max-w-[140px]">{event.page ?? "—"}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-mono text-muted-foreground">{event.ipAddress ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{device} · {browser}</div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatIST(event.createdAt)}
      </td>
    </motion.tr>
  );
}

export default function SecurityAlertsPage() {
  const { user } = useAuthStore();
  const role = (user as { role?: { isSystemRole?: boolean; roleName?: string } } | null)?.role;
  const isSuperAdmin = role?.isSystemRole && role?.roleName === "Super Admin";

  const [filters, setFilters] = useState<{
    action: TrapAction | "";
    dateFrom: string;
    dateTo: string;
    page: number;
  }>({ action: "", dateFrom: "", dateTo: "", page: 1 });

  useTrapSocket();

  const { data, isLoading, refetch, isFetching } = useTrapEvents({
    action:   filters.action || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo:   filters.dateTo   || undefined,
    page:     filters.page,
    limit:    50,
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 text-destructive/50" />
        <p className="text-sm font-medium">Access restricted to Super Admin only.</p>
      </div>
    );
  }

  return (
    <motion.div variants={PAGE_VARIANTS} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Security Alerts</h1>
            <p className="text-sm text-muted-foreground">Real-time data leak trap events</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.entries(ACTION_LABELS) as [TrapAction, typeof ACTION_LABELS[TrapAction]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = data?.events.filter((e) => e.action === key).length ?? 0;
          return (
            <motion.div
              key={key}
              variants={ITEM_VARIANTS}
              onClick={() => setFilters((f) => ({ ...f, action: f.action === key ? "" : key, page: 1 }))}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                filters.action === key ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${cfg.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{cfg.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <select
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value as TrapAction | "", page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Actions</option>
          {(Object.entries(ACTION_LABELS) as [TrapAction, typeof ACTION_LABELS[TrapAction]][]).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-muted-foreground text-sm">to</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {(filters.action || filters.dateFrom || filters.dateTo) && (
          <button
            onClick={() => setFilters({ action: "", dateFrom: "", dateTo: "", page: 1 })}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {data?.total ?? 0} total events
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.events.length ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-10 w-10 opacity-30" />
            <p className="text-sm">No trap events recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {["#", "Employee", "Action", "Lead / Phone", "Page", "IP / Device", "Time"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={PAGE_VARIANTS} initial="hidden" animate="visible">
                {data.events.map((event, i) => (
                  <TrapRow key={event._id} event={event} index={i} />
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {filters.page} of {data.pages}
          </span>
          <button
            disabled={filters.page >= data.pages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Warning note */}
      <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          All trap events are logged silently. Employees are not notified when a trap fires.
          Screenshot detection is based on rapid tab-switching (&lt;3 s) and may have false positives.
          Use this data as a signal, not as definitive proof.
        </p>
      </div>
    </motion.div>
  );
}
