"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Download, Copy, Printer, MessageCircle,
  Filter, RefreshCw, AlertTriangle, LogIn, LogOut,
  Bell, BellOff, Circle, Users,
} from "lucide-react";
import { useTrapEvents, useTrapSocket, type TrapAction, type TrapEvent } from "@/hooks/useTrapEvents";
import { useLoginHistory, type LoginEvent } from "@/hooks/useLoginHistory";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/lib/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIST(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function parseDevice(ua: string = "") {
  const device  = ua.includes("Mobile") ? "Mobile" : ua.includes("Windows") ? "Windows" : ua.includes("Mac") ? "Mac" : "—";
  const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "—";
  return `${device} · ${browser}`;
}

// Play a short alert beep using Web Audio API — no external file needed
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {}
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<TrapAction, { label: string; icon: React.ElementType; color: string }> = {
  download_leads:  { label: "Download Attempt", icon: Download,       color: "text-red-500 bg-red-500/10" },
  copy_phone:      { label: "Copy Phone",        icon: Copy,           color: "text-orange-500 bg-orange-500/10" },
  print_attempt:   { label: "Print Attempt",     icon: Printer,        color: "text-yellow-500 bg-yellow-500/10" },
  whatsapp_share:  { label: "WhatsApp Share",    icon: MessageCircle,  color: "text-green-500 bg-green-500/10" },
};

const PAGE_VARIANTS = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, staggerChildren: 0.06 } },
};
const ITEM_VARIANTS = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: TrapAction }) {
  const cfg = ACTION_LABELS[action];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-muted-foreground/30"}`} />
  );
}

// ── Trap Events Tab ───────────────────────────────────────────────────────────

function TrapEventsTab({ soundEnabled }: { soundEnabled: boolean }) {
  const [filters, setFilters] = useState<{ action: TrapAction | ""; dateFrom: string; dateTo: string; page: number }>({
    action: "", dateFrom: "", dateTo: "", page: 1,
  });

  const { data, isLoading, refetch, isFetching } = useTrapEvents({
    action:   filters.action || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo:   filters.dateTo   || undefined,
    page:     filters.page,
    limit:    50,
  });

  // Real-time + sound
  const qc = useQueryClient();
  const { accessToken } = useAuthStore();
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    function handler() {
      qc.invalidateQueries({ queryKey: ["traps"] });
      if (soundEnabled && !isFirstRender.current) playAlertSound();
      isFirstRender.current = false;
    }
    socket.on("trap:alert", handler);
    return () => { socket.off("trap:alert", handler); };
  }, [accessToken, qc, soundEnabled]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(ACTION_LABELS) as [TrapAction, typeof ACTION_LABELS[TrapAction]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = data?.events.filter((e) => e.action === key).length ?? 0;
          return (
            <motion.div
              key={key} variants={ITEM_VARIANTS}
              onClick={() => setFilters((f) => ({ ...f, action: f.action === key ? "" : key, page: 1 }))}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${filters.action === key ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"}`}
            >
              <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${cfg.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{cfg.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value as TrapAction | "", page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none">
          <option value="">All Actions</option>
          {(Object.entries(ACTION_LABELS) as [TrapAction, typeof ACTION_LABELS[TrapAction]][]).map(([k, c]) => (
            <option key={k} value={k}>{c.label}</option>
          ))}
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none" />
        <span className="text-muted-foreground text-sm">to</span>
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none" />
        {(filters.action || filters.dateFrom || filters.dateTo) && (
          <button onClick={() => setFilters({ action: "", dateFrom: "", dateTo: "", page: 1 })}
            className="text-xs text-muted-foreground underline hover:text-foreground">Clear</button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{data?.total ?? 0} events</span>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !data?.events.length ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 opacity-30" /><p className="text-sm">No trap events yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>{["#","Employee","Action","Lead / Phone","Page","IP / Device","Time"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {data.events.map((event: TrapEvent, i) => (
                  <motion.tr key={event._id} variants={ITEM_VARIANTS}
                    className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold">{event.user?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{event.user?.email}</div>
                    </td>
                    <td className="px-4 py-3"><ActionBadge action={event.action} /></td>
                    <td className="px-4 py-3">
                      {event.leadId ? (
                        <div>
                          <div className="text-sm">{(event.leadId as { name?: string }).name ?? event.leadName ?? "—"}</div>
                          {event.phoneNumber && <div className="text-xs text-muted-foreground font-mono">{event.phoneNumber}</div>}
                        </div>
                      ) : event.phoneNumber ? (
                        <div className="text-sm font-mono">{event.phoneNumber}</div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3"><div className="text-xs text-muted-foreground truncate max-w-[120px]">{event.page ?? "—"}</div></td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-muted-foreground">{event.ipAddress ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{parseDevice(event.userAgent)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatIST(event.createdAt)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted">Previous</button>
          <span className="text-sm text-muted-foreground">Page {filters.page} of {data.pages}</span>
          <button disabled={filters.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted">Next</button>
        </div>
      )}
    </div>
  );
}

// ── Login History Tab ─────────────────────────────────────────────────────────

function LoginHistoryTab() {
  const [filters, setFilters] = useState<{ dateFrom: string; dateTo: string; page: number }>({
    dateFrom: "", dateTo: "", page: 1,
  });
  const { data, isLoading, refetch, isFetching } = useLoginHistory({
    dateFrom: filters.dateFrom || undefined,
    dateTo:   filters.dateTo   || undefined,
    page:     filters.page,
    limit:    50,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none" />
        <span className="text-muted-foreground text-sm">to</span>
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none" />
        {(filters.dateFrom || filters.dateTo) && (
          <button onClick={() => setFilters({ dateFrom: "", dateTo: "", page: 1 })}
            className="text-xs text-muted-foreground underline hover:text-foreground">Clear</button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{data?.total ?? 0} events</span>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !data?.events.length ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <LogIn className="h-8 w-8 opacity-30" /><p className="text-sm">No login events yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>{["#","Employee","Action","IP Address","Device / Browser","Time"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {data.events.map((ev: LoginEvent, i) => (
                  <motion.tr key={ev._id} variants={ITEM_VARIANTS}
                    className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold">{ev.user?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{ev.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ev.type === "login" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"}`}>
                        {ev.type === "login" ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                        {ev.type === "login" ? "Login" : "Logout"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{ev.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{parseDevice(ev.userAgent)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatIST(ev.createdAt)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted">Previous</button>
          <span className="text-sm text-muted-foreground">Page {filters.page} of {data.pages}</span>
          <button disabled={filters.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted">Next</button>
        </div>
      )}
    </div>
  );
}

// ── Online Users Tab ──────────────────────────────────────────────────────────

function OnlineUsersTab() {
  const onlineIds = useOnlineUsers();
  const { data: usersData, isLoading } = useUsers({ limit: "200" });
  const users = usersData?.data ?? [];
  const onlineList = users.filter((u) => onlineIds.has(u._id));
  const offlineList = users.filter((u) => !onlineIds.has(u._id));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Circle className="h-3 w-3 fill-green-400 text-green-400" />
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Online Now</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{onlineList.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Circle className="h-3 w-3 fill-muted-foreground/30 text-muted-foreground/30" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Offline</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{offlineList.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>{["Status","Employee","Email","Role"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {/* Online first */}
                {[...onlineList, ...offlineList].map((u, i) => {
                  const isOnline = onlineIds.has(u._id);
                  const roleName = typeof u.role === "object" ? (u.role as { roleName?: string }).roleName ?? "—" : "—";
                  return (
                    <motion.tr key={u._id} variants={ITEM_VARIANTS}
                      className="border-b border-border hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <OnlineDot online={isOnline} />
                          <span className={`text-xs font-semibold ${isOnline ? "text-green-400" : "text-muted-foreground"}`}>
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{roleName}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "traps" | "login" | "online";

export default function SecurityAlertsPage() {
  const { user } = useAuthStore();
  const role = (user as { role?: { isSystemRole?: boolean; roleName?: string } } | null)?.role;
  const isSuperAdmin = role?.isSystemRole && role?.roleName === "Super Admin";

  const [activeTab, setActiveTab] = useState<Tab>("traps");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("trapSoundEnabled") !== "false";
  });

  const toggleSound = () => {
    setSoundEnabled((v) => {
      const next = !v;
      localStorage.setItem("trapSoundEnabled", String(next));
      if (next) playAlertSound();
      return next;
    });
  };

  useTrapSocket();

  if (!isSuperAdmin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 text-destructive/50" />
        <p className="text-sm font-medium">Access restricted to Super Admin only.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "traps",  label: "Trap Events",    icon: ShieldAlert },
    { id: "login",  label: "Login History",  icon: LogIn },
    { id: "online", label: "Live Users",     icon: Users },
  ];

  return (
    <motion.div variants={PAGE_VARIANTS} initial="hidden" animate="visible" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Security Center</h1>
            <p className="text-sm text-muted-foreground">Trap events · Login history · Live presence</p>
          </div>
        </div>
        {/* Sound toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleSound}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            soundEnabled
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <AnimatePresence mode="wait">
            {soundEnabled ? (
              <motion.span key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Bell className="h-4 w-4" /> Alert Sound On
              </motion.span>
            ) : (
              <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <BellOff className="h-4 w-4" /> Alert Sound Off
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === id && (
              <motion.div layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" />{label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeTab === "traps"  && <TrapEventsTab soundEnabled={soundEnabled} />}
          {activeTab === "login"  && <LoginHistoryTab />}
          {activeTab === "online" && <OnlineUsersTab />}
        </motion.div>
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          All trap events are logged silently — employees are never notified.
          Live presence is based on active WebSocket connections and updates in real-time.
        </p>
      </div>
    </motion.div>
  );
}
