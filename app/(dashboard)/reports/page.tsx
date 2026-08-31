"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Users, UsersRound, Target, Award,
  Calendar, RefreshCw, BarChart2, Activity, Layers,
  GitFork, IndianRupee, Trophy, ChevronDown, ChevronUp,
  Loader2, Tag, X, ArrowUpRight, BookMarked, CheckCircle2, SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ExportPdfDialog } from "@/components/reports/ExportPdfDialog";
import { AiChatPanel } from "@/components/leads/AiChatPanel";
import {
  useReportOverview,
  useReportTimeline,
  useReportUserRankings,
  useReportTeamRankings,
  useReportTeamSplit,
  useRevenueOverview,
  useRevenueTimeline,
  useRevenueTeams,
  useSourceAnalytics,
  useCampaignBreakdown,
  useBookingsReport,
  useClosingsReport,
  useTeamMemberReport,
} from "@/hooks/useReports";
import { useUsers } from "@/hooks/useUsers";
import { useTeams } from "@/hooks/useTeams";
import { useAuthStore } from "@/lib/store/authStore";
import type {
  TimelinePeriod, LeadStatus, SplitPeriod,
  RevenuePeriod, RevenueTeamDetail, RevenueMemberItem,
  SourceAnalyticsItem, CampaignBreakdownItem,
} from "@/types/reports";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  LeadStatus,
  { label: string; color: string; bar: string; dot: string }
> = {
  new:            { label: "New",             color: "#3b82f6", bar: "bg-blue-500",    dot: "bg-blue-400"    },
  assigned:       { label: "Assigned",        color: "#eab308", bar: "bg-yellow-500",  dot: "bg-yellow-400"  },
  followup:       { label: "Follow Up",       color: "#f97316", bar: "bg-orange-500",  dot: "bg-orange-400"  },
  interested:     { label: "Interested",      color: "#8b5cf6", bar: "bg-violet-500",  dot: "bg-violet-400"  },
  cnc:            { label: "CNC",             color: "#64748b", bar: "bg-slate-500",   dot: "bg-slate-400"   },
  booking:        { label: "Booking",         color: "#14b8a6", bar: "bg-teal-500",    dot: "bg-teal-400"    },
  notinterested:  { label: "Not Interested",  color: "#f97316", bar: "bg-orange-500",  dot: "bg-orange-400"  },
  closed:         { label: "Closed",          color: "#22c55e", bar: "bg-green-500",   dot: "bg-green-400"   },
  invalid:        { label: "Invalid",         color: "#ef4444", bar: "bg-red-500",     dot: "bg-red-400"     },
  rnr:            { label: "RNR",             color: "#f59e0b", bar: "bg-amber-500",   dot: "bg-amber-400"   },
  callback:       { label: "Call Back",       color: "#0ea5e9", bar: "bg-sky-500",     dot: "bg-sky-400"     },
  whatsapp:       { label: "WhatsApp",        color: "#25d366", bar: "bg-emerald-500", dot: "bg-emerald-400" },
  student:        { label: "Student",         color: "#6366f1", bar: "bg-indigo-500",  dot: "bg-indigo-400"  },
};

const ALL_STATUSES: LeadStatus[] = [
  "new","assigned","followup","interested","cnc","booking","notinterested","closed","invalid",
  "rnr","callback","whatsapp","student",
];

const SOURCE_COLORS: Record<string, string> = {
  social:   "#8b5cf6",
  organic:  "#22c55e",
  referral: "#3b82f6",
  direct:   "#f97316",
  other:    "#64748b",
};

const BAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b",
  "#10b981","#3b82f6","#ef4444","#14b8a6",
];

/** Palette for team bars in the split chart (cycles if more than 12 teams) */
const TEAM_PALETTE = [
  "#6366f1","#22c55e","#f97316","#14b8a6","#eab308","#ef4444",
  "#8b5cf6","#3b82f6","#ec4899","#84cc16","#06b6d4","#f43f5e",
];

// ── Period helpers ────────────────────────────────────────────────────────────

type QuickPeriod = "today" | "week" | "month" | "quarter" | "year" | "custom";

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

function getQuickRange(p: QuickPeriod): { from: string; to: string } {
  const now   = new Date();
  const today = toISO(now);
  switch (p) {
    case "today":   return { from: today, to: today };
    case "week": {
      const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: toISO(mon), to: today };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISO(first), to: today };
    }
    case "quarter": {
      const first = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { from: toISO(first), to: today };
    }
    case "year": {
      return { from: toISO(new Date(now.getFullYear(), 0, 1)), to: today };
    }
    default: return { from: "", to: "" };
  }
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted/50", className)} />;
}

function Empty({ text = "No data for this period" }: { text?: string }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <BarChart2 className="h-8 w-8 opacity-20" />
      {text}
    </div>
  );
}

interface KpiCardProps {
  title:      string;
  value:      string | number;
  sub?:       string;
  icon:       React.ElementType;
  gradient:   string;
  delay?:     number;
  loading?:   boolean;
  className?: string;
}
function KpiCard({ title, value, sub, icon: Icon, gradient, delay = 0, loading, className }: KpiCardProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow h-full">
        <div className={cn("absolute inset-0 opacity-5", gradient)} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
              {loading
                ? <Skeleton className="h-8 w-20 mt-1" />
                : <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{value}</p>
              }
              {sub && !loading && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ml-3", gradient)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

function MiniStatusBars({ item, total }: { item: Record<string, number>; total: number }) {
  return (
    <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-full min-w-[60px]">
      {ALL_STATUSES.map((s) => {
        const count = item[s] ?? 0;
        const pct   = total > 0 ? (count / total) * 100 : 0;
        if (pct === 0) return null;
        return (
          <div
            key={s}
            className={cn("h-full", STATUS_META[s].bar)}
            style={{ width: `${pct}%` }}
            title={`${STATUS_META[s].label}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs max-w-[200px]">
      <p className="font-semibold text-foreground mb-2 truncate">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="truncate">{p.name}</span>
          </span>
          <span className="font-bold text-foreground shrink-0">{p.value}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold">{total}</span>
        </div>
      )}
    </div>
  );
}

// ── Currency helpers ──────────────────────────────────────────────────────────

/** Compact format: ₹1.2Cr / ₹12.5L / ₹1.5K / ₹500 */
function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

/** Full Indian locale format: ₹1,23,45,678 */
function fullINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Plain Indian number format: 1,23,456 */
function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

// ── Revenue chart tooltip ─────────────────────────────────────────────────────

function RevTooltip({ active, payload, label }: {
  active?:   boolean;
  payload?:  Array<{ name: string; value: number; color: string }>;
  label?:    string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs max-w-[230px]">
      <p className="font-semibold text-foreground mb-2 truncate">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="truncate">{p.name}</span>
          </span>
          <span className="font-bold text-foreground shrink-0">{fullINR(p.value ?? 0)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold">{fullINR(total)}</span>
        </div>
      )}
    </div>
  );
}

// ── Period header (shared between tabs with independent state) ────────────────

interface PeriodHeaderProps {
  quickPeriod:    QuickPeriod;
  setQuickPeriod: (p: QuickPeriod) => void;
  customFrom:     string;
  setCustomFrom:  (v: string) => void;
  customTo:       string;
  setCustomTo:    (v: string) => void;
}

function PeriodHeader({
  quickPeriod, setQuickPeriod,
  customFrom, setCustomFrom,
  customTo, setCustomTo,
}: PeriodHeaderProps) {
  const quickBtns: { id: QuickPeriod; label: string }[] = [
    { id: "today",   label: "Today"     },
    { id: "week",    label: "This Week" },
    { id: "month",   label: "This Month"},
    { id: "quarter", label: "Quarter"   },
    { id: "year",    label: "This Year" },
    { id: "custom",  label: "Custom"    },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {quickBtns.map((b) => (
          <button
            key={b.id}
            onClick={() => setQuickPeriod(b.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
              quickPeriod === b.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {quickPeriod === "custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: Overview
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [period, setPeriod]       = useState<TimelinePeriod>("daily");
  const [chartView, setChartView] = useState<"all" | LeadStatus>("all");

  const overview  = useReportOverview(dateFrom, dateTo);
  const timeline  = useReportTimeline(period, dateFrom, dateTo);
  const userRanks = useReportUserRankings(dateFrom, dateTo);
  const teamRanks = useReportTeamRankings(dateFrom, dateTo);

  const isLoading  = overview.isLoading;
  const summary    = overview.data?.summary;
  const statusDist = overview.data?.statusDistribution ?? [];
  const sourceDist = overview.data?.sourceDistribution ?? [];

  const pieData = statusDist
    .filter((s) => s.count > 0)
    .map((s) => ({ name: STATUS_META[s.status]?.label, value: s.count, color: STATUS_META[s.status]?.color }));

  const sourceData = sourceDist.map((s) => ({
    name:  s.source.charAt(0).toUpperCase() + s.source.slice(1),
    count: s.count,
    fill:  SOURCE_COLORS[s.source] ?? "#64748b",
  }));

  const timelineSeries: { key: string; label: string; color: string }[] =
    chartView === "all"
      ? [
          { key: "total",      label: "Total",     color: "#94a3b8" },
          { key: "closed",     label: "Closed",    color: "#22c55e" },
          { key: "interested", label: "Interested",color: "#8b5cf6" },
          { key: "booking",    label: "Booking",   color: "#14b8a6" },
        ]
      : [{ key: chartView, label: STATUS_META[chartView]?.label, color: STATUS_META[chartView]?.color }];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard title="Total Leads"     value={summary?.total ?? 0}           icon={Layers}    gradient="bg-gradient-to-br from-blue-500 to-blue-600"   delay={0}    loading={isLoading} />
        <KpiCard title="Closed / Won"    value={summary?.closed ?? 0}          icon={Target}    gradient="bg-gradient-to-br from-green-500 to-green-600"  delay={0.06} loading={isLoading} />
        <KpiCard title="Conversion Rate" value={`${summary?.conversionRate ?? 0}%`} sub="closed ÷ total" icon={TrendingUp} gradient="bg-gradient-to-br from-violet-500 to-violet-600" delay={0.12} loading={isLoading} />
        <KpiCard title="Active Teams"    value={summary?.activeTeams ?? 0}     sub={`of ${summary?.totalTeams ?? 0} total`} icon={UsersRound} gradient="bg-gradient-to-br from-orange-500 to-orange-600" delay={0.18} loading={isLoading} />
        <KpiCard title="Active Users"    value={summary?.activeUsers ?? 0}     icon={Users}     gradient="bg-gradient-to-br from-teal-500 to-teal-600"    delay={0.24} loading={isLoading} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Timeline + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Area chart */}
        <motion.div className="lg:col-span-3" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Lead Volume Over Time
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={chartView} onValueChange={(v) => setChartView(v as typeof chartView)}>
                    <SelectTrigger className="h-7 w-32 text-xs border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All overview</SelectItem>
                      {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-lg border border-border/50 overflow-hidden">
                    {(["daily","weekly","monthly"] as TimelinePeriod[]).map((p) => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={cn("px-2.5 py-1 text-xs capitalize font-medium transition-colors",
                          period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                        {p === "daily" ? "D" : p === "weekly" ? "W" : "M"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {timeline.isLoading ? <Skeleton className="h-[260px] w-full" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={timeline.data ?? []} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <defs>
                      {timelineSeries.map((s) => (
                        <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={s.color} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize:10, fill:"hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize:10, fill:"hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    {timelineSeries.length > 1 && (
                      <Legend wrapperStyle={{ fontSize:"11px", paddingTop:"8px" }}
                        formatter={(v) => <span style={{ color:"hsl(var(--muted-foreground))" }}>{v}</span>} />
                    )}
                    {timelineSeries.map((s) => (
                      <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                        stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`}
                        dot={false} activeDot={{ r:4, strokeWidth:0 }} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Donut */}
        <motion.div className="lg:col-span-2" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.36 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? <Skeleton className="h-[220px] w-full" /> : pieData.length === 0 ? <Empty /> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg">
                              <span className="font-semibold">{payload[0].name}</span>: {payload[0].value}
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                    {statusDist.filter((s) => s.count > 0).map((s) => (
                      <div key={s.status} className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_META[s.status]?.dot)} />
                          <span className="text-xs text-muted-foreground truncate">{STATUS_META[s.status]?.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User + Team rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* User Rankings */}
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.42 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> User Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto -mx-2 px-2">
                {userRanks.isLoading
                  ? <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  : !userRanks.data?.length ? <Empty />
                  : (
                    <table className="w-full text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="pb-2 text-left font-medium text-muted-foreground w-8">#</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground">Agent</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Total</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground text-green-500">Closed</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Conv%</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground pl-3 hidden sm:table-cell">Breakdown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {userRanks.data.map((u) => (
                          <motion.tr key={u.userId} initial={{ opacity:0,x:-10 }} animate={{ opacity:1,x:0 }} transition={{ delay:0.05*u.rank }} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-2"><RankBadge rank={u.rank} /></td>
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">{u.name.charAt(0)}</div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate max-w-[120px]">{u.name}</p>
                                  {u.designation && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{u.designation}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 text-right font-semibold tabular-nums">{u.total}</td>
                            <td className="py-2.5 text-right"><span className="font-bold text-green-500 tabular-nums">{u.closed}</span></td>
                            <td className="py-2.5 text-right">
                              <span className={cn("font-semibold tabular-nums", u.conversionRate>=50?"text-green-500":u.conversionRate>=25?"text-yellow-500":"text-muted-foreground")}>
                                {u.conversionRate}%
                              </span>
                            </td>
                            <td className="py-2.5 pl-3 hidden sm:table-cell">
                              <MiniStatusBars item={u as unknown as Record<string,number>} total={u.total} />
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Rankings */}
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.48 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-primary" /> Team Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto -mx-2 px-2">
                {teamRanks.isLoading
                  ? <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  : !teamRanks.data?.length ? <Empty />
                  : (
                    <table className="w-full text-xs min-w-[520px]">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="pb-2 text-left font-medium text-muted-foreground w-8">#</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground">Team</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Members</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Leads</th>
                          <th className="pb-2 text-right font-medium text-emerald-500">Revenue</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Conv%</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground pl-3 hidden sm:table-cell">Breakdown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {teamRanks.data.map((t) => (
                          <motion.tr key={t.teamId} initial={{ opacity:0,x:10 }} animate={{ opacity:1,x:0 }} transition={{ delay:0.05*t.rank }} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-2"><RankBadge rank={t.rank} /></td>
                            <td className="py-2.5 pr-3"><p className="font-semibold text-foreground truncate max-w-[140px]">{t.name}</p></td>
                            <td className="py-2.5 text-right tabular-nums text-muted-foreground">{t.memberCount}</td>
                            <td className="py-2.5 text-right font-semibold tabular-nums">{t.total}</td>
                            <td className="py-2.5 text-right">
                              <span className="font-bold text-emerald-500 tabular-nums">
                                ₹{(t.totalPayments ?? 0).toLocaleString("en-IN")}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <span className={cn("font-semibold tabular-nums", t.conversionRate>=50?"text-green-500":t.conversionRate>=25?"text-yellow-500":"text-muted-foreground")}>
                                {t.conversionRate}%
                              </span>
                            </td>
                            <td className="py-2.5 pl-3 hidden sm:table-cell">
                              <MiniStatusBars item={t as unknown as Record<string,number>} total={t.total} />
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Status bars + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.54 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Leads by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {isLoading
                ? <div className="space-y-3">{[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                : statusDist.map((s, idx) => {
                    const meta  = STATUS_META[s.status];
                    const maxC  = Math.max(...statusDist.map((x) => x.count), 1);
                    return (
                      <motion.div key={s.status} initial={{ opacity:0,x:-20 }} animate={{ opacity:1,x:0 }} transition={{ delay:0.06*idx }} className="flex items-center gap-3">
                        <div className="w-20 shrink-0 text-xs text-muted-foreground font-medium text-right">{meta?.label}</div>
                        <div className="flex-1 h-6 rounded-full bg-muted/40 overflow-hidden">
                          <motion.div className={cn("h-full rounded-full", meta?.bar)}
                            initial={{ width:0 }} animate={{ width:`${(s.count/maxC)*100}%` }}
                            transition={{ delay:0.1+0.05*idx, duration:0.6, ease:"easeOut" }} />
                        </div>
                        <div className="w-16 shrink-0 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground tabular-nums">{s.count}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{s.pct}%</span>
                        </div>
                      </motion.div>
                    );
                  })
              }
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.6 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Leads by Source
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? <Skeleton className="h-[220px] w-full" /> : sourceData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sourceData} layout="vertical" margin={{ top:0, right:30, left:10, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis type="number" tick={{ fontSize:10, fill:"hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:"hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={65} />
                    <RechartsTooltip content={<ChartTooltip />} cursor={{ fill:"hsl(var(--muted))", opacity:0.3 }} />
                    <Bar dataKey="count" name="Leads" radius={[0,4,4,0]} maxBarSize={28}>
                      {sourceData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top 3 Performers */}
      {!userRanks.isLoading && (userRanks.data?.length ?? 0) >= 1 && (
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.66 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" /> Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {userRanks.data!.slice(0,3).map((u,i) => {
                  const grads = [
                    "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20",
                    "from-slate-400/10 to-slate-400/5 border-slate-400/20",
                    "from-orange-700/10 to-orange-700/5 border-orange-700/20",
                  ];
                  return (
                    <motion.div key={u.userId} initial={{ opacity:0,scale:0.95 }} animate={{ opacity:1,scale:1 }} transition={{ delay:0.1*i }}
                      className={cn("rounded-xl border bg-gradient-to-br p-4 text-center", grads[i])}>
                      <div className="text-3xl mb-2">{["🥇","🥈","🥉"][i]}</div>
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg uppercase mb-2">
                        {u.name.charAt(0)}
                      </div>
                      <p className="font-bold text-foreground text-sm truncate">{u.name}</p>
                      {u.designation && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{u.designation}</p>}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-base font-bold text-foreground tabular-nums">{u.total}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
                        <div><p className="text-base font-bold text-green-500 tabular-nums">{u.closed}</p><p className="text-[10px] text-muted-foreground">Closed</p></div>
                        <div><p className="text-base font-bold text-violet-500 tabular-nums">{u.conversionRate}%</p><p className="text-[10px] text-muted-foreground">Conv.</p></div>
                      </div>
                      <div className="mt-3"><MiniStatusBars item={u as unknown as Record<string,number>} total={u.total} /></div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: Lead Splitting
// ─────────────────────────────────────────────────────────────────────────────

function LeadSplitTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [splitPeriod, setSplitPeriod] = useState<SplitPeriod>("monthly");
  const [focusTeam,   setFocusTeam]   = useState<string>("all");

  const query = useReportTeamSplit(splitPeriod, dateFrom, dateTo);
  const data  = query.data;

  const teams    = data?.teams    ?? [];
  const timeline = data?.timeline ?? [];
  const summary  = data?.summary  ?? [];

  // Chart series — filter to focused team or show all
  const activeSeries = useMemo(() => {
    const allTeams = focusTeam === "all" ? teams : teams.filter((t) => t === focusTeam);
    return allTeams.map((name, i) => ({
      name,
      color: TEAM_PALETTE[i % TEAM_PALETTE.length],
    }));
  }, [teams, focusTeam]);

  const periodBtns: { id: SplitPeriod; label: string }[] = [
    { id: "daily",   label: "Daily"   },
    { id: "weekly",  label: "Weekly"  },
    { id: "monthly", label: "Monthly" },
    { id: "yearly",  label: "Yearly"  },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period toggle */}
        <div className="flex rounded-lg border border-border/50 overflow-hidden shrink-0">
          {periodBtns.map((b) => (
            <button
              key={b.id}
              onClick={() => setSplitPeriod(b.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                splitPeriod === b.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Team focus filter */}
        {teams.length > 1 && (
          <Select value={focusTeam} onValueChange={setFocusTeam}>
            <SelectTrigger className="h-8 w-44 text-xs border-border/50">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {query.isFetching && (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
        )}
      </div>

      {/* Stacked bar chart */}
      <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitFork className="h-4 w-4 text-primary" />
              Lead Distribution by Team
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                {splitPeriod}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {query.isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : timeline.length === 0 ? (
              <Empty text="No team lead data for this period" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={timeline} margin={{ top:5, right:20, left:-15, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize:10, fill:"hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize:10, fill:"hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip content={<ChartTooltip />} cursor={{ fill:"hsl(var(--muted))", opacity:0.3 }} />
                  <Legend
                    wrapperStyle={{ fontSize:"11px", paddingTop:"12px" }}
                    formatter={(v) => <span style={{ color:"hsl(var(--foreground))" }}>{v}</span>}
                  />
                  {activeSeries.map((s) => (
                    <Bar
                      key={s.name}
                      dataKey={s.name}
                      name={s.name}
                      stackId="a"
                      fill={s.color}
                      radius={activeSeries[activeSeries.length - 1].name === s.name ? [4,4,0,0] : [0,0,0,0]}
                      maxBarSize={60}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Team-by-team count cards (top summary) */}
      {!query.isLoading && summary.length > 0 && (
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2 }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {summary.map((t, i) => {
              const color = TEAM_PALETTE[i % TEAM_PALETTE.length];
              return (
                <motion.div
                  key={t.teamName}
                  initial={{ opacity:0, scale:0.95 }}
                  animate={{ opacity:1, scale:1 }}
                  transition={{ delay:0.05*i }}
                  onClick={() => setFocusTeam(focusTeam === t.teamName ? "all" : t.teamName)}
                  className={cn(
                    "rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                    focusTeam === t.teamName
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border/50 bg-card/80 hover:border-border",
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0"
                      style={{ background: color }}
                    >
                      {t.teamName.charAt(0).toUpperCase()}
                    </div>
                    <RankBadge rank={t.rank} />
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate mb-1">{t.teamName}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{t.total}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">leads total</p>
                  <MiniStatusBars item={t as unknown as Record<string,number>} total={t.total} />
                  <div className="mt-2 flex justify-between text-[10px]">
                    <span className="text-green-500 font-semibold">✓ {t.closed} closed</span>
                    <span className="text-muted-foreground">{t.conversionRate}% conv</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Detailed status table */}
      {!query.isLoading && summary.length > 0 && (
        <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Team Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-xs" style={{ minWidth: "720px" }}>
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-2 text-left font-medium text-muted-foreground w-8">#</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">Team</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Total</th>
                      {ALL_STATUSES.map((s) => (
                        <th key={s} className="pb-2 text-right font-medium" style={{ color: STATUS_META[s].color }}>
                          {STATUS_META[s].label}
                        </th>
                      ))}
                      <th className="pb-2 text-right font-medium text-green-500">Conv%</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground pl-3">Split</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {summary.map((t, i) => {
                      const color = TEAM_PALETTE[i % TEAM_PALETTE.length];
                      return (
                        <motion.tr
                          key={t.teamName}
                          initial={{ opacity:0, x:-10 }}
                          animate={{ opacity:1, x:0 }}
                          transition={{ delay:0.04*i }}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2.5 pr-2"><RankBadge rank={t.rank} /></td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                              <span className="font-semibold text-foreground truncate max-w-[120px]">{t.teamName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-right font-bold tabular-nums">{t.total}</td>
                          {ALL_STATUSES.map((s) => (
                            <td key={s} className="py-2.5 text-right tabular-nums text-muted-foreground">
                              {(t as unknown as Record<string,number>)[s] ?? 0}
                            </td>
                          ))}
                          <td className="py-2.5 text-right">
                            <span className={cn("font-semibold tabular-nums",
                              t.conversionRate>=50?"text-green-500":t.conversionRate>=25?"text-yellow-500":"text-muted-foreground")}>
                              {t.conversionRate}%
                            </span>
                          </td>
                          <td className="py-2.5 pl-3 min-w-[80px]">
                            <MiniStatusBars item={t as unknown as Record<string,number>} total={t.total} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  {/* Totals row */}
                  {summary.length > 1 && (() => {
                    const grand = summary.reduce((acc, t) => {
                      acc.total += t.total;
                      ALL_STATUSES.forEach((s) => { acc[s] = (acc[s] ?? 0) + ((t as unknown as Record<string,number>)[s] ?? 0); });
                      return acc;
                    }, { total: 0 } as Record<string, number>);
                    return (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/20">
                          <td />
                          <td className="py-2.5 pr-3 text-xs font-bold text-foreground">Total</td>
                          <td className="py-2.5 text-right font-bold tabular-nums">{grand.total}</td>
                          {ALL_STATUSES.map((s) => (
                            <td key={s} className="py-2.5 text-right font-semibold tabular-nums text-foreground">{grand[s] ?? 0}</td>
                          ))}
                          <td className="py-2.5 text-right">
                            <span className={cn("font-semibold tabular-nums",
                              grand.total > 0 && ((grand.closed/grand.total)*100)>=50 ? "text-green-500"
                              : grand.total > 0 && ((grand.closed/grand.total)*100)>=25 ? "text-yellow-500"
                              : "text-muted-foreground")}>
                              {grand.total > 0 ? +((grand.closed/grand.total)*100).toFixed(1) : 0}%
                            </span>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: Revenue
// ─────────────────────────────────────────────────────────────────────────────

function RevenueTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [revPeriod,    setRevPeriod]    = useState<RevenuePeriod>("monthly");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const overview = useRevenueOverview(dateFrom, dateTo);
  const timeline = useRevenueTimeline(revPeriod, dateFrom, dateTo);
  const teamsQ   = useRevenueTeams(dateFrom, dateTo);

  const ovData     = overview.data;
  const tlData     = timeline.data;
  const teamsData  = (teamsQ.data ?? []) as RevenueTeamDetail[];
  const tlTeams    = tlData?.teams    ?? [];
  const tlTimeline = tlData?.timeline ?? [];

  const periodBtns: { id: RevenuePeriod; label: string }[] = [
    { id: "daily",   label: "D" },
    { id: "weekly",  label: "W" },
    { id: "monthly", label: "M" },
    { id: "yearly",  label: "Y" },
  ];

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Total Revenue"
          value={overview.isLoading ? "—" : fmtINR(ovData?.totalRevenue ?? 0)}
          sub={`${ovData?.paymentCount ?? 0} payments`}
          icon={IndianRupee}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          delay={0}
          loading={overview.isLoading}
        />
        <KpiCard
          title="Top Earning Team"
          value={overview.isLoading ? "—" : fmtINR(ovData?.topTeam?.revenue ?? 0)}
          sub={ovData?.topTeam?.name ?? "No data"}
          icon={Trophy}
          gradient="bg-gradient-to-br from-yellow-500 to-yellow-600"
          delay={0.06}
          loading={overview.isLoading}
        />
        <KpiCard
          title="Top Earning Agent"
          value={overview.isLoading ? "—" : fmtINR(ovData?.topAgent?.revenue ?? 0)}
          sub={ovData?.topAgent?.name ?? "No data"}
          icon={Award}
          gradient="bg-gradient-to-br from-violet-500 to-violet-600"
          delay={0.12}
          loading={overview.isLoading}
        />
        <KpiCard
          title="Avg per Lead"
          value={overview.isLoading ? "—" : fmtINR(ovData?.avgRevenuePerLead ?? 0)}
          sub={`${ovData?.payingLeadCount ?? 0} paying leads`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          delay={0.18}
          loading={overview.isLoading}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* ── Revenue Timeline Chart ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.24 }}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Revenue Over Time
              </CardTitle>
              <div className="flex rounded-lg border border-border/50 overflow-hidden self-start">
                {periodBtns.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setRevPeriod(b.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      revPeriod === b.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {timeline.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : tlTimeline.length === 0 ? (
              <Empty text="No revenue data for this period" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={tlTimeline} margin={{ top:5, right:10, left:10, bottom:0 }}>
                  <defs>
                    {(tlTeams.length > 0 ? tlTeams : ["Total"]).map((t, i) => (
                      <linearGradient key={t} id={`rev-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={TEAM_PALETTE[i % TEAM_PALETTE.length]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={TEAM_PALETTE[i % TEAM_PALETTE.length]} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize:10, fill:"hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize:10, fill:"hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => fmtINR(v)}
                    width={60}
                  />
                  <RechartsTooltip content={<RevTooltip />} />
                  {tlTeams.length > 1 && (
                    <Legend
                      wrapperStyle={{ fontSize:"11px", paddingTop:"8px" }}
                      formatter={(v) => <span style={{ color:"hsl(var(--foreground))" }}>{v}</span>}
                    />
                  )}
                  {tlTeams.length === 0 ? (
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Revenue"
                      stroke={TEAM_PALETTE[0]}
                      strokeWidth={2}
                      fill="url(#rev-grad-0)"
                      dot={false}
                      activeDot={{ r:4, strokeWidth:0 }}
                    />
                  ) : tlTeams.map((t, i) => (
                    <Area
                      key={t}
                      type="monotone"
                      dataKey={t}
                      name={t}
                      stroke={TEAM_PALETTE[i % TEAM_PALETTE.length]}
                      strokeWidth={2}
                      fill={`url(#rev-grad-${i})`}
                      dot={false}
                      activeDot={{ r:4, strokeWidth:0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Team Revenue Rankings + Agent Leaderboard ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Team Revenue Rankings — expandable */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-primary" /> Team Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {teamsQ.isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : teamsData.length === 0 ? (
                <Empty text="No team revenue data" />
              ) : (
                <div className="space-y-2">
                  {teamsData.map((team, i) => {
                    const color      = TEAM_PALETTE[i % TEAM_PALETTE.length];
                    const maxRev     = teamsData[0]?.revenue ?? 1;
                    const barPct     = maxRev > 0 ? (team.revenue / maxRev) * 100 : 0;
                    const isExpanded = expandedTeam === String(team.teamId);
                    return (
                      <motion.div
                        key={String(team.teamId)}
                        initial={{ opacity:0, x:-10 }}
                        animate={{ opacity:1, x:0 }}
                        transition={{ delay:0.04 * i }}
                      >
                        <button
                          onClick={() => setExpandedTeam(isExpanded ? null : String(team.teamId))}
                          className="w-full text-left rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <RankBadge rank={team.rank} />
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
                              style={{ background: color }}
                            >
                              {team.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-foreground truncate">{team.name}</span>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-xs font-bold text-emerald-500 tabular-nums">{fullINR(team.revenue)}</span>
                                  {isExpanded
                                    ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  }
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${barPct}%` }}
                                  transition={{ delay: 0.1 + 0.04 * i, duration: 0.6, ease: "easeOut" }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {team.paymentCount} payments · {team.leadCount} leads
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Member breakdown accordion */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-1 ml-4 pl-3 border-l-2 border-border/40 space-y-2 pb-2 pt-1">
                                {team.members.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground">No member data</p>
                                ) : team.members.map((m: RevenueMemberItem) => (
                                  <div key={String(m.userId)} className="flex items-center gap-2 text-xs">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase">
                                      {m.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-foreground truncate max-w-[130px]">{m.name}</span>
                                        <span className="font-semibold text-emerald-500 tabular-nums shrink-0 ml-2">{fullINR(m.revenue)}</span>
                                      </div>
                                      {m.designation && (
                                        <p className="text-[10px] text-muted-foreground">{m.designation}</p>
                                      )}
                                      <div className="h-1 rounded-full bg-muted/40 overflow-hidden mt-1">
                                        <motion.div
                                          className="h-full rounded-full bg-emerald-500/60"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${m.pct}%` }}
                                          transition={{ duration: 0.4, ease: "easeOut" }}
                                        />
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0 w-9 text-right tabular-nums">{m.pct}%</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Revenue Leaderboard */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.36 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Agent Revenue Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {overview.isLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : !(ovData?.agentBreakdown?.length) ? (
                <Empty text="No agent revenue data" />
              ) : (
                <div className="space-y-2">
                  {ovData!.agentBreakdown.map((a, i) => {
                    const maxRev = ovData!.agentBreakdown[0]?.revenue ?? 1;
                    const barPct = maxRev > 0 ? (a.revenue / maxRev) * 100 : 0;
                    const podiumGrads = [
                      "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20",
                      "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/20",
                      "bg-gradient-to-r from-orange-700/10 to-transparent border-orange-700/20",
                    ];
                    return (
                      <motion.div
                        key={String(a.userId)}
                        initial={{ opacity:0, x:10 }}
                        animate={{ opacity:1, x:0 }}
                        transition={{ delay:0.04 * i }}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-xl border",
                          i < 3
                            ? podiumGrads[i]
                            : "border-transparent bg-muted/20 hover:bg-muted/40 transition-colors",
                        )}
                      >
                        <RankBadge rank={a.rank} />
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                          {a.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate max-w-[140px]">{a.name}</p>
                              {a.designation && (
                                <p className="text-[10px] text-muted-foreground truncate">{a.designation}</p>
                              )}
                            </div>
                            <span className="text-xs font-bold text-emerald-500 tabular-nums shrink-0 ml-2">
                              {fullINR(a.revenue)}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ delay: 0.1 + 0.04 * i, duration: 0.5, ease: "easeOut" }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                            {a.paymentCount} payment{a.paymentCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Top 3 Revenue Earners podium ──────────────────────────────────── */}
      {!overview.isLoading && (ovData?.agentBreakdown?.length ?? 0) >= 1 && (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.42 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Top Revenue Earners
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ovData!.agentBreakdown.slice(0, 3).map((a, i) => {
                  const grads = [
                    "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20",
                    "from-slate-400/10 to-slate-400/5 border-slate-400/20",
                    "from-orange-700/10 to-orange-700/5 border-orange-700/20",
                  ];
                  return (
                    <motion.div
                      key={String(a.userId)}
                      initial={{ opacity:0, scale:0.95 }}
                      animate={{ opacity:1, scale:1 }}
                      transition={{ delay:0.1 * i }}
                      className={cn("rounded-xl border bg-gradient-to-br p-4 text-center", grads[i])}
                    >
                      <div className="text-3xl mb-2">{["🥇","🥈","🥉"][i]}</div>
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg uppercase mb-2">
                        {a.name.charAt(0)}
                      </div>
                      <p className="font-bold text-foreground text-sm truncate">{a.name}</p>
                      {a.designation && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.designation}</p>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                        <div>
                          <p className="text-sm font-bold text-emerald-500 tabular-nums">{fmtINR(a.revenue)}</p>
                          <p className="text-[10px] text-muted-foreground">Revenue</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground tabular-nums">{a.paymentCount}</p>
                          <p className="text-[10px] text-muted-foreground">Payments</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: Source Analytics
// ─────────────────────────────────────────────────────────────────────────────

function CampaignPanel({
  source, dateFrom, dateTo, onClose,
}: {
  source: string; dateFrom: string; dateTo: string; onClose: () => void;
}) {
  const { data = [], isLoading } = useCampaignBreakdown(source, dateFrom, dateTo);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
    >
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <CardTitle className="text-xs font-semibold capitalize">
              Campaigns — {source}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No campaigns found for this source.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 text-left">Campaign</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Closed</th>
                    <th className="px-4 py-2 text-right">Booking</th>
                    <th className="px-4 py-2 text-right">Conversion</th>
                    <th className="px-4 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data as CampaignBreakdownItem[]).map((c, i) => (
                    <motion.tr
                      key={c.campaignId}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/20"
                    >
                      <td className="px-4 py-2 font-mono text-[11px] font-medium max-w-[200px] truncate">{c.campaignId}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(c.total)}</td>
                      <td className="px-4 py-2 text-right text-green-500 tabular-nums">{fmt(c.closed)}</td>
                      <td className="px-4 py-2 text-right text-teal-500 tabular-nums">{fmt(c.booking)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={cn("font-semibold tabular-nums",
                          c.conversionRate >= 10 ? "text-green-500" : c.conversionRate >= 5 ? "text-yellow-500" : "text-red-500")}>
                          {c.conversionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-primary font-semibold tabular-nums">{fmtINR(c.revenue)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SourceAnalyticsTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.isSystemRole === true && user?.role?.roleName === "Super Admin";

  const [teamId,        setTeamId]        = useState("all");
  const [sortKey,       setSortKey]       = useState<keyof SourceAnalyticsItem>("total");
  const [sortAsc,       setSortAsc]       = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const { data: teamsData } = useTeams({ status: "active", limit: 100 });
  const { data = [], isLoading } = useSourceAnalytics(
    dateFrom, dateTo,
    teamId !== "all" ? teamId : undefined,
  );

  const summary = useMemo(() => {
    if (!data.length) return { totalLeads: 0, bestSource: "—", topConversion: 0, totalRevenue: 0 };
    const totalLeads   = data.reduce((s, r) => s + r.total, 0);
    const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
    const best         = [...data].sort((a, b) => b.conversionRate - a.conversionRate)[0];
    return { totalLeads, totalRevenue, bestSource: best?.source ?? "—", topConversion: best?.conversionRate ?? 0 };
  }, [data]);

  const sorted = useMemo(
    () => [...data].sort((a, b) => {
      const av = a[sortKey] as number, bv = b[sortKey] as number;
      return sortAsc ? av - bv : bv - av;
    }),
    [data, sortKey, sortAsc],
  );

  function toggleSort(key: keyof SourceAnalyticsItem) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: keyof SourceAnalyticsItem }) {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  }

  return (
    <div className="space-y-6">
      {/* Team filter — Super Admin only */}
      {isSuperAdmin && (teamsData?.data?.length ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Filter by team:</span>
            <Select value={teamId} onValueChange={(v) => { setTeamId(v); setSelectedSource(null); }}>
              <SelectTrigger className="h-8 w-44 text-xs border-border/50">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {(teamsData?.data ?? []).map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard title="Total Leads"    value={fmt(summary.totalLeads)}   icon={Layers}    gradient="bg-gradient-to-br from-blue-500 to-blue-600"    delay={0}    />
            <KpiCard title="Best Source"    value={summary.bestSource}        sub={`${summary.topConversion}% conversion`} icon={Target} gradient="bg-gradient-to-br from-green-500 to-green-600" delay={0.06} />
            <KpiCard title="Total Revenue"  value={fmtINR(summary.totalRevenue)} icon={IndianRupee} gradient="bg-gradient-to-br from-teal-500 to-teal-600"  delay={0.12} />
            <KpiCard title="Active Sources" value={String(data.length)}       icon={TrendingUp} gradient="bg-gradient-to-br from-violet-500 to-violet-600" delay={0.18} className="col-span-2 lg:col-span-1" />
          </div>

          {/* Bar chart */}
          {data.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" /> Leads by Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis dataKey="source" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                        tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        formatter={((v: unknown) => [fmt(Number(v ?? 0)), "Leads"]) as never}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Sortable table with campaign drill-down */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Source Breakdown
                  <span className="text-xs font-normal text-muted-foreground ml-1">— click a row to view campaigns</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <Empty text="No leads found for this date range" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 text-left">Source</th>
                          {(
                            [
                              ["total",          "Total"],
                              ["closed",         "Closed"],
                              ["booking",        "Booking"],
                              ["conversionRate", "Conversion"],
                              ["bookingRate",    "Booking Rate"],
                              ["revenue",        "Revenue"],
                            ] as [keyof SourceAnalyticsItem, string][]
                          ).map(([k, label]) => (
                            <th key={k}
                              className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                              onClick={() => toggleSort(k)}
                            >
                              {label}<SortIcon k={k} />
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right">Campaigns</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        <AnimatePresence>
                          {sorted.map((row, i) => {
                            const isSelected = selectedSource === row.source;
                            return (
                              <>
                                <motion.tr
                                  key={row.source}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  onClick={() => setSelectedSource(isSelected ? null : row.source)}
                                  className={cn("cursor-pointer transition-colors",
                                    isSelected ? "bg-primary/10" : "hover:bg-muted/30")}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                                      <span className="font-semibold capitalize">{row.source}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold tabular-nums">{fmt(row.total)}</td>
                                  <td className="px-4 py-3 text-right text-green-500 tabular-nums">{fmt(row.closed)}</td>
                                  <td className="px-4 py-3 text-right text-teal-500 tabular-nums">{fmt(row.booking)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={cn("font-semibold tabular-nums",
                                      row.conversionRate >= 15 ? "text-green-500" : row.conversionRate >= 5 ? "text-yellow-500" : "text-red-500")}>
                                      {row.conversionRate}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.bookingRate}%</td>
                                  <td className="px-4 py-3 text-right text-primary font-semibold tabular-nums">{fmtINR(row.revenue)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedSource(isSelected ? null : row.source); }}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                                    >
                                      <ArrowUpRight className="h-3 w-3" /> View
                                    </button>
                                  </td>
                                </motion.tr>
                                {isSelected && (
                                  <tr key={`${row.source}-campaigns`}>
                                    <td colSpan={8} className="px-4 py-3 bg-muted/10">
                                      <AnimatePresence>
                                        <CampaignPanel source={row.source} dateFrom={dateFrom} dateTo={dateTo} onClose={() => setSelectedSource(null)} />
                                      </AnimatePresence>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS TAB
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared status-report table ────────────────────────────────────────────────

function StatusReportTab({
  mode,
  dateFrom,
  dateTo,
  accentColor,
  icon: Icon,
  emptyLabel,
  useHook,
  defaultDateField,
  dateFieldOptions,
  tableHeaders,
  renderRow,
}: {
  mode: string;
  dateFrom: string;
  dateTo: string;
  accentColor: string;
  icon: React.ElementType;
  emptyLabel: string;
  useHook: typeof useBookingsReport;
  defaultDateField: string;
  dateFieldOptions: { value: string; label: string }[];
  tableHeaders: string[];
  renderRow: (lead: import("@/types/lead").Lead, i: number) => React.ReactNode;
}) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.isSystemRole === true && user?.role?.roleName === "Super Admin";

  const [search,     setSearch]     = useState("");
  const [dSearch,    setDSearch]    = useState("");
  const [teamId,     setTeamId]     = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [sortBy,     setSortBy]     = useState(defaultDateField);
  const [sortOrder,  setSortOrder]  = useState<"desc"|"asc">("desc");
  const [dateField,  setDateField]  = useState(defaultDateField);
  const [page,       setPage]       = useState(1);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: teamsResult } = useTeams({ limit: "200" } as never);
  const allTeams = teamsResult?.data ?? [];
  const { data: usersData } = useUsers({ status: "active", limit: "200" });
  const allUsers = usersData?.data ?? [];

  const { data, isLoading } = useHook({
    dateFrom:   dateFrom   || undefined,
    dateTo:     dateTo     || undefined,
    dateField,
    sortBy,
    sortOrder,
    search:     dSearch    || undefined,
    team:       teamId     !== "all" ? teamId     : undefined,
    assignedTo: assignedTo !== "all" ? assignedTo : undefined,
    page,
    limit: 50,
  });

  const leads = data?.data ?? [];
  const pagination = data?.pagination;

  function handleSearch(val: string) {
    setSearch(val);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDSearch(val); setPage(1); }, 400);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentColor}/15`}>
              <Icon className={`h-5 w-5 ${accentColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{pagination?.total ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                Total {mode}{dateFrom && dateTo ? ` (${dateFrom} → ${dateTo})` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters & Sort</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {/* Search */}
            <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Search client, staff, batch..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* Date field filter */}
            <Select value={dateField} onValueChange={(v) => { setDateField(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateFieldOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort by */}
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sort by…" />
              </SelectTrigger>
              <SelectContent>
                {dateFieldOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>Sort: {o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort order */}
            <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v as "asc"|"desc"); setPage(1); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>

            {/* Team filter */}
            {isSuperAdmin && (
              <Select value={teamId} onValueChange={(v) => { setTeamId(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {allTeams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Assigned to filter */}
            {isSuperAdmin && (
              <Select value={assignedTo} onValueChange={(v) => { setAssignedTo(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {allUsers.map((u) => (
                    <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Icon className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-semibold">No {emptyLabel} found</p>
              <p className="text-sm text-muted-foreground">Try adjusting the date range, filters, or search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead>
                  <tr className="border-b border-border/40">
                    {tableHeaders.map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => renderRow(lead, i))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.page}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.totalPages}</span>{" "}
            <span className="hidden sm:inline">({pagination.total} {mode})</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={!pagination.hasPrevPage}>
              Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!pagination.hasNextPage}>
              Next
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS TAB WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

const BOOKING_DATE_FIELD_OPTIONS = [
  { value: "bookedAt",  label: "Booked At" },
  { value: "createdAt", label: "Created At" },
  { value: "updatedAt", label: "Updated At" },
];

const BOOKING_HEADERS = ["Client", "Contact", "Email", "Batch", "Time", "Mode", "Staff", "WhatsApp", "Team", "Course", "Booked At"];

function BookingsTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  return (
    <StatusReportTab
      mode="bookings"
      dateFrom={dateFrom}
      dateTo={dateTo}
      accentColor="text-teal-400"
      icon={BookMarked}
      emptyLabel="No bookings found"
      useHook={useBookingsReport}
      defaultDateField="bookedAt"
      dateFieldOptions={BOOKING_DATE_FIELD_OPTIONS}
      tableHeaders={BOOKING_HEADERS}
      renderRow={(lead, i) => {
        const bd = lead.bookingDetails;
        return (
          <motion.tr
            key={lead._id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="border-b border-border/20 hover:bg-muted/30 transition-colors"
          >
            <td className="px-4 py-3 font-medium text-foreground">{bd?.clientName || lead.name || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground font-mono">{bd?.contactNo || lead.phone || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground">{bd?.clientEmail || lead.email || "—"}</td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">{bd?.batch || "—"}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">{bd?.time || "—"}</td>
            <td className="px-4 py-3">
              {bd?.mode ? (
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold capitalize",
                  bd.mode === "online" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", bd.mode === "online" ? "bg-blue-400" : "bg-orange-400")} />
                  {bd.mode}
                </span>
              ) : "—"}
            </td>
            <td className="px-4 py-3 font-medium">{bd?.staffName || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground font-mono">{bd?.whatsappNo || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground">
              {lead.team && typeof lead.team === "object" ? (lead.team as { name: string }).name : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {lead.course && typeof lead.course === "object" ? (lead.course as { name: string }).name : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
              {bd?.bookedAt
                ? new Date(bd.bookedAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
                    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                  })
                : "—"}
            </td>
          </motion.tr>
        );
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSINGS TAB WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

const CLOSING_DATE_FIELD_OPTIONS = [
  { value: "updatedAt", label: "Closed At" },
  { value: "createdAt", label: "Created At" },
];

const CLOSING_HEADERS = ["Client", "Contact", "Email", "Staff", "Team", "Course", "Assigned To", "Closed At", "Created At"];

function ClosingsTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  return (
    <StatusReportTab
      mode="closings"
      dateFrom={dateFrom}
      dateTo={dateTo}
      accentColor="text-green-400"
      icon={CheckCircle2}
      emptyLabel="No closed leads found"
      useHook={useClosingsReport}
      defaultDateField="updatedAt"
      dateFieldOptions={CLOSING_DATE_FIELD_OPTIONS}
      tableHeaders={CLOSING_HEADERS}
      renderRow={(lead, i) => {
        const assignedUser = lead.assignedTo && typeof lead.assignedTo === "object"
          ? (lead.assignedTo as { name: string }).name
          : "—";
        return (
          <motion.tr
            key={lead._id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="border-b border-border/20 hover:bg-muted/30 transition-colors"
          >
            <td className="px-4 py-3 font-medium text-foreground">{lead.name || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground font-mono">{lead.phone || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground">{lead.email || "—"}</td>
            <td className="px-4 py-3 font-medium">
              {lead.bookingDetails?.staffName || "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {lead.team && typeof lead.team === "object" ? (lead.team as { name: string }).name : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {lead.course && typeof lead.course === "object" ? (lead.course as { name: string }).name : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground">{assignedUser}</td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
              {lead.updatedAt
                ? new Date(lead.updatedAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
                    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                  })
                : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
              {lead.createdAt
                ? new Date(lead.createdAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
                    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                  })
                : "—"}
            </td>
          </motion.tr>
        );
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM REPORT TAB
// ─────────────────────────────────────────────────────────────────────────────

// All statuses ordered for the general table
const GENERAL_STATUS_COLS: { key: string; label: string; color: string }[] = [
  { key: "new",           label: "New",         color: "text-blue-400"    },
  { key: "assigned",      label: "Assigned",     color: "text-yellow-400"  },
  { key: "followup",      label: "Follow Up",    color: "text-orange-400"  },
  { key: "interested",    label: "Interested",   color: "text-violet-400"  },
  { key: "cnc",           label: "CNC",          color: "text-slate-400"   },
  { key: "booking",       label: "Booking",      color: "text-teal-400"    },
  { key: "notinterested", label: "Not Int.",     color: "text-orange-400"  },
  { key: "closed",        label: "Closed",       color: "text-green-400"   },
  { key: "invalid",       label: "Invalid",      color: "text-red-400"     },
  { key: "rnr",           label: "RNR",          color: "text-amber-400"   },
  { key: "callback",      label: "Call Back",    color: "text-sky-400"     },
  { key: "whatsapp",      label: "WhatsApp",     color: "text-emerald-400" },
  { key: "student",       label: "Student",      color: "text-indigo-400"  },
];

// "Other" statuses for booking teams (everything except booking)
const BOOKING_OTHER_COLS = GENERAL_STATUS_COLS.filter((c) => c.key !== "booking");
// "Other" statuses for closing teams (everything except closed, but include booking)
const CLOSING_OTHER_COLS = GENERAL_STATUS_COLS.filter((c) => c.key !== "closed");

// Shared member avatar cell
function MemberCell({ name, roleName }: { name: string; roleName?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase">
        {name?.charAt(0) ?? "?"}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{name}</p>
        {roleName && <p className="text-[10px] text-muted-foreground truncate">{roleName}</p>}
      </div>
    </div>
  );
}

function StatCell({ val, color, bold }: { val: number; color?: string; bold?: boolean }) {
  if (val === 0) return <span className="text-muted-foreground/40">—</span>;
  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full px-2 py-0.5 font-semibold min-w-[28px] bg-muted/60",
      color,
      bold && "font-bold",
    )}>
      {val}
    </span>
  );
}

function TeamReportTab({ globalDateFrom: _gdf, globalDateTo: _gdt }: { globalDateFrom: string; globalDateTo: string }) {
  const { data: teamsResult } = useTeams({ limit: "200" } as never);
  const allTeams = teamsResult?.data ?? [];

  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const teamId = selectedTeam || (allTeams[0]?._id ?? "");

  const { data, isLoading } = useTeamMemberReport(teamId);

  const selectedTeamName = allTeams.find((t) => t._id === teamId)?.name ?? "";

  // Summary badge values
  const summaryTotal = data
    ? data.reportType === "general"
      ? data.grandTotal
      : data.totals.total
    : null;

  const summaryThisMonth = data && data.reportType !== "general"
    ? data.totals.targetThisMonth
    : null;

  const summaryLabel = data?.reportType === "booking"
    ? "Bookings this month"
    : data?.reportType === "closing"
      ? "Closings this month"
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header — team selector + badges */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <Select value={teamId} onValueChange={(v) => setSelectedTeam(v)}>
                <SelectTrigger className="h-9 text-sm max-w-xs">
                  <SelectValue placeholder="Select a team…" />
                </SelectTrigger>
                <SelectContent>
                  {allTeams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {data && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
                  {data.rows.length} members
                </span>
                {summaryTotal !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    {summaryTotal} total leads
                  </span>
                )}
                {summaryThisMonth !== null && summaryLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 text-teal-400 px-3 py-1 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {summaryThisMonth} {summaryLabel}
                  </span>
                )}
                {data.reportType !== "general" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
                    {data.totals.conversionRate}% conv.
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !teamId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <UsersRound className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-semibold">Select a team</p>
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <UsersRound className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-semibold">No data</p>
              <p className="text-sm text-muted-foreground">No leads found for {selectedTeamName}.</p>
            </div>
          ) : data.reportType === "general" ? (
            // ── GENERAL TABLE ──────────────────────────────────────────────────
            <div className="overflow-x-auto">
              <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Member Report</span>
                <span className="text-xs text-muted-foreground ml-1">Lead status breakdown per member · all time</span>
              </div>
              <table className="w-full text-xs" style={{ minWidth: `${(GENERAL_STATUS_COLS.length + 2) * 88}px` }}>
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[170px]">Member</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                    {GENERAL_STATUS_COLS.map((c) => (
                      <th key={c.key} className={cn("px-4 py-3 text-right font-medium whitespace-nowrap", c.color)}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <motion.tr key={row.member._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                      className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-card px-4 py-3">
                        <MemberCell name={row.member.name} roleName={row.member.role?.roleName} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{row.total}</td>
                      {GENERAL_STATUS_COLS.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                          <StatCell val={(row.counts ?? {})[c.key] ?? 0} color={c.color} />
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                  <tr className="border-t-2 border-border/60 bg-muted/20">
                    <td className="sticky left-0 z-10 bg-muted/20 px-4 py-3 text-sm font-semibold">Team Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-foreground tabular-nums">{data.grandTotal}</td>
                    {GENERAL_STATUS_COLS.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                        <StatCell val={(data.totals ?? {})[c.key] ?? 0} color={c.color} bold />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            // ── BOOKING / CLOSING TABLE ────────────────────────────────────────
            (() => {
              const isBooking  = data.reportType === "booking";
              const targetLabel  = isBooking ? "Bookings This Month" : "Closings This Month";
              const targetColor  = isBooking ? "text-teal-400" : "text-green-400";
              const otherCols    = isBooking ? BOOKING_OTHER_COLS : CLOSING_OTHER_COLS;
              const specialRows  = data.rows;
              const specialTotals= data.totals;

              return (
                <div className="overflow-x-auto">
                  <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Member Report</span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full ml-1",
                      isBooking ? "bg-teal-500/15 text-teal-400" : "bg-green-500/15 text-green-400"
                    )}>
                      {data.reportType}
                    </span>
                    <span className="text-xs text-muted-foreground">· {new Date().toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}</span>
                  </div>
                  <table className="w-full text-xs" style={{ minWidth: `${(otherCols.length + 6) * 88}px` }}>
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[170px]">Member</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Total Leads</th>
                        <th className="px-4 py-3 text-right font-medium text-blue-400 whitespace-nowrap">This Month</th>
                        <th className="px-4 py-3 text-right font-medium text-violet-400 whitespace-nowrap">Old Conversions</th>
                        <th className={cn("px-4 py-3 text-right font-medium whitespace-nowrap", targetColor)}>{targetLabel}</th>
                        <th className="px-4 py-3 text-right font-medium text-amber-400 whitespace-nowrap">Conv. Rate</th>
                        {otherCols.map((c) => (
                          <th key={c.key} className={cn("px-4 py-3 text-right font-medium whitespace-nowrap", c.color)}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {specialRows.map((row, i) => (
                        <motion.tr key={row.member._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                          className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-4 py-3">
                            <MemberCell name={row.member.name} roleName={row.member.role?.roleName} />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{row.total}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <StatCell val={row.thisMonth} color="text-blue-400" />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <StatCell val={row.oldConversions} color="text-violet-400" />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <StatCell val={row.targetThisMonth} color={targetColor} />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {row.thisMonth > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 font-semibold bg-amber-500/10 text-amber-400 min-w-[44px]">
                                {row.conversionRate}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          {otherCols.map((c) => (
                            <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                              <StatCell val={row.otherCounts[c.key] ?? 0} color={c.color} />
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                      {/* Team Total row */}
                      <tr className="border-t-2 border-border/60 bg-muted/20">
                        <td className="sticky left-0 z-10 bg-muted/20 px-4 py-3 text-sm font-semibold">Team Total</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-foreground tabular-nums">{specialTotals.total}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <StatCell val={specialTotals.thisMonth} color="text-blue-400" bold />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <StatCell val={specialTotals.oldConversions} color="text-violet-400" bold />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <StatCell val={specialTotals.targetThisMonth} color={targetColor} bold />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {specialTotals.thisMonth > 0 ? (
                            <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 font-bold bg-amber-500/10 text-amber-400 min-w-[44px]">
                              {specialTotals.conversionRate}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        {otherCols.map((c) => (
                          <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                            <StatCell val={specialTotals.otherStatuses[c.key] ?? 0} color={c.color} bold />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT PAGE
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "overview" | "split" | "revenue" | "sources" | "bookings" | "closing" | "teams";

const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",      shortLabel: "Overview", icon: BarChart2    },
  { id: "split",     label: "Lead Splitting", shortLabel: "Leads",    icon: GitFork      },
  { id: "revenue",   label: "Revenue",        shortLabel: "Revenue",  icon: IndianRupee  },
  { id: "sources",   label: "Sources",        shortLabel: "Sources",  icon: TrendingUp   },
  { id: "bookings",  label: "Bookings",       shortLabel: "Bookings", icon: BookMarked   },
  { id: "closing",   label: "Closings",       shortLabel: "Closings", icon: CheckCircle2 },
  { id: "teams",     label: "Teams",          shortLabel: "Teams",    icon: UsersRound   },
];

function ReportsPageContent() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>(() => (sp.get("tab") as Tab) ?? "overview");

  // Shared period state — each tab inherits the same date range
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>(() => (sp.get("period") as QuickPeriod) ?? "month");
  const [customFrom,  setCustomFrom]  = useState(() => sp.get("from") ?? "");
  const [customTo,    setCustomTo]    = useState(() => sp.get("to") ?? "");

  const { from: dateFrom, to: dateTo } = useMemo(() => {
    if (quickPeriod === "custom") return { from: customFrom, to: customTo };
    return getQuickRange(quickPeriod) as { from: string; to: string };
  }, [quickPeriod, customFrom, customTo]);

  // ── Sync state → URL ───────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "overview") params.set("tab", activeTab);
    if (quickPeriod !== "month") params.set("period", quickPeriod);
    if (customFrom) params.set("from", customFrom);
    if (customTo) params.set("to", customTo);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [activeTab, quickPeriod, customFrom, customTo]);

  // ── Smart-hide header on mobile scroll ─────────────────────────────────────
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY  = useRef(0);
  const SCROLL_THRESHOLD = 6; // px — prevents jitter on tiny movements

  useEffect(() => {
    // The dashboard's scroll container is the <main> element
    const scrollEl = document.querySelector("main") as HTMLElement | null;
    if (!scrollEl) return;

    // function handleScroll() {
    //   // Desktop: always visible
    //   if (window.innerWidth >= 640) {
    //     setHeaderVisible(true);
    //     lastScrollY.current = scrollEl!.scrollTop;
    //     return;
    //   }

    //   const currentY = scrollEl!.scrollTop;
    //   const delta    = currentY - lastScrollY.current;

    //   if (Math.abs(delta) < SCROLL_THRESHOLD) return;

    //   if (delta > 0 && currentY > 60) {
    //     // Scrolling DOWN and not near top → hide
    //     setHeaderVisible(false);
    //   } else {
    //     // Scrolling UP or near top → show
    //     setHeaderVisible(true);
    //   }

    //   lastScrollY.current = currentY;
    // }

    // function handleResize() {
    //   if (window.innerWidth >= 640) setHeaderVisible(true);
    // }

    // scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    // window.addEventListener("resize", handleResize, { passive: true });
    // return () => {
    //   scrollEl.removeEventListener("scroll", handleScroll);
    //   window.removeEventListener("resize", handleResize);
    // };
  }, []);

  return (
    <div>
      {/* ── Sticky header (auto-hides on mobile scroll-down) ──────────────── */}
      <motion.div
        className=" z-10 -mx-6 px-6 border-b border-border/30"
        animate={{ y: headerVisible ? 0 : "-150%" }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="py-4 space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground">Reports & Analytics</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "All time"}
                </p>
              </div>
            </div>

            {/* Export PDF */}
            <ExportPdfDialog type="overall" entityName="CRM Overall" />
          </div>

          {/* Tabs — pill style with spring animation */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
            {TABS.map(({ id, label, shortLabel, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "relative flex items-center gap-2 px-3 sm:px-4 py-1.5 text-sm font-medium transition-colors rounded-lg",
                  activeTab === id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {activeTab === id && (
                  <motion.div
                    layoutId="tab-active-pill"
                    className="absolute inset-0 rounded-lg bg-card border border-border/50 shadow-md"
                    transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 hidden sm:inline">{label}</span>
                <span className="relative z-10 sm:hidden">{shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Period selector — shared, sits below tabs */}
        <div className="py-3 border-t border-border/20">
          <PeriodHeader
            quickPeriod={quickPeriod}
            setQuickPeriod={setQuickPeriod}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
          />
        </div>
      </motion.div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="py-6 max-w-[1600px] mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === "overview" ? (
            <motion.div key="overview" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              <OverviewTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          ) : activeTab === "split" ? (
            <motion.div key="split" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              <LeadSplitTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          ) : activeTab === "revenue" ? (
            <motion.div key="revenue" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              <RevenueTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          ) : activeTab === "bookings" ? (
            <motion.div key="bookings" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              <BookingsTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          ) : activeTab === "closing" ? (
            <motion.div key="closing" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              <ClosingsTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          ) : activeTab === "teams" ? (
            <motion.div key="teams" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              <TeamReportTab globalDateFrom={dateFrom} globalDateTo={dateTo} />
            </motion.div>
          ) : (
            <motion.div key="sources" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              <SourceAnalyticsTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Analytics Assistant */}
        {/* <div className="max-w-2xl">
          <AiChatPanel contextType="report" contextId="global" />
        </div> */}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ReportsPageContent />
    </Suspense>
  );
}
