"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Users, UsersRound, Target, Award,
  Calendar, RefreshCw, BarChart2, Activity, Layers,
  GitFork,
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
import {
  useReportOverview,
  useReportTimeline,
  useReportUserRankings,
  useReportTeamRankings,
  useReportTeamSplit,
} from "@/hooks/useReports";
import type { TimelinePeriod, LeadStatus, SplitPeriod } from "@/types/reports";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  LeadStatus,
  { label: string; color: string; bar: string; dot: string }
> = {
  new:        { label: "New",       color: "#3b82f6", bar: "bg-blue-500",   dot: "bg-blue-400"   },
  assigned:   { label: "Assigned",  color: "#eab308", bar: "bg-yellow-500", dot: "bg-yellow-400" },
  followup:   { label: "Follow Up", color: "#f97316", bar: "bg-orange-500", dot: "bg-orange-400" },
  interested: { label: "Interested",color: "#8b5cf6", bar: "bg-violet-500", dot: "bg-violet-400" },
  cnc:        { label: "CNC",       color: "#64748b", bar: "bg-slate-500",  dot: "bg-slate-400"  },
  booking:    { label: "Booking",   color: "#14b8a6", bar: "bg-teal-500",   dot: "bg-teal-400"   },
  closed:     { label: "Closed",    color: "#22c55e", bar: "bg-green-500",  dot: "bg-green-400"  },
  rejected:   { label: "Rejected",  color: "#ef4444", bar: "bg-red-500",    dot: "bg-red-400"    },
};

const ALL_STATUSES: LeadStatus[] = [
  "new","assigned","followup","interested","cnc","booking","closed","rejected",
];

const SOURCE_COLORS: Record<string, string> = {
  social:   "#8b5cf6",
  organic:  "#22c55e",
  referral: "#3b82f6",
  direct:   "#f97316",
  other:    "#64748b",
};

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
                    <table className="w-full text-xs min-w-[480px]">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="pb-2 text-left font-medium text-muted-foreground w-8">#</th>
                          <th className="pb-2 text-left font-medium text-muted-foreground">Team</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Members</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground">Total</th>
                          <th className="pb-2 text-right font-medium text-muted-foreground text-green-500">Closed</th>
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
                            <td className="py-2.5 text-right"><span className="font-bold text-green-500 tabular-nums">{t.closed}</span></td>
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
// ROOT PAGE
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "overview" | "split";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview",      icon: BarChart2 },
  { id: "split",    label: "Lead Splitting", icon: GitFork  },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Shared period state — each tab inherits the same date range
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>("month");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");

  const { from: dateFrom, to: dateTo } = useMemo(() => {
    if (quickPeriod === "custom") return { from: customFrom, to: customTo };
    return getQuickRange(quickPeriod) as { from: string; to: string };
  }, [quickPeriod, customFrom, customTo]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-4 space-y-4">
          {/* Title row */}
          <div className="flex items-center gap-3">
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

          {/* Tabs */}
          <div className="flex gap-1 border-b border-transparent -mb-4">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "relative flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium transition-colors rounded-t-lg",
                  activeTab === id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{id === "overview" ? "Overview" : "Split"}</span>
                {activeTab === id && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Period selector — shared, sits below tabs */}
        <div className="px-4 sm:px-6 py-3 border-t border-border/30 bg-background/60">
          <PeriodHeader
            quickPeriod={quickPeriod}
            setQuickPeriod={setQuickPeriod}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
          />
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === "overview" ? (
            <motion.div
              key="overview"
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-10 }}
              transition={{ duration:0.2 }}
            >
              <OverviewTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          ) : (
            <motion.div
              key="split"
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-10 }}
              transition={{ duration:0.2 }}
            >
              <LeadSplitTab dateFrom={dateFrom} dateTo={dateTo} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
