"use client";
import { useState, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, ChevronDown, ChevronUp, Loader2,
  CalendarDays, BarChart3, Target, IndianRupee,
  ArrowUpRight, Tag, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSourceAnalytics, useCampaignBreakdown } from "@/hooks/useReports";
import { useTeams } from "@/hooks/useTeams";
import { useAuthStore } from "@/lib/store/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SourceAnalyticsItem } from "@/types/reports";

const BAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}
function fmtRupee(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthStartISO() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function CampaignPanel({
  source,
  dateFrom,
  dateTo,
  onClose,
}: {
  source: string;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}) {
  const { data = [], isLoading } = useCampaignBreakdown(source, dateFrom, dateTo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold capitalize">
              Campaigns — {source}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No campaigns found for this source.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 text-left">Campaign</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right">Closed</th>
                    <th className="px-4 py-2.5 text-right">Booking</th>
                    <th className="px-4 py-2.5 text-right">Conversion</th>
                    <th className="px-4 py-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((c, i) => (
                    <motion.tr
                      key={c.campaignId}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/20"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">{c.campaignId}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmt(c.total)}</td>
                      <td className="px-4 py-2.5 text-right text-green-400">{fmt(c.closed)}</td>
                      <td className="px-4 py-2.5 text-right text-teal-400">{fmt(c.booking + c.partialbooking)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-semibold ${c.conversionRate >= 10 ? "text-green-400" : c.conversionRate >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                          {c.conversionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-primary font-medium">{fmtRupee(c.revenue)}</td>
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold truncate">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SourceAnalyticsContent() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.isSystemRole === true && user?.role?.roleName === "Super Admin";

  const [dateFrom, setDateFrom] = useState(monthStartISO);
  const [dateTo,   setDateTo]   = useState(todayISO);
  const [teamId,   setTeamId]   = useState("all");
  const [sortKey,  setSortKey]  = useState<keyof SourceAnalyticsItem>("total");
  const [sortAsc,  setSortAsc]  = useState(false);
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
    return {
      totalLeads,
      totalRevenue,
      bestSource:    best?.source ?? "—",
      topConversion: best?.conversionRate ?? 0,
    };
  }, [data]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortAsc ? av - bv : bv - av;
    });
  }, [data, sortKey, sortAsc]);

  function toggleSort(key: keyof SourceAnalyticsItem) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: keyof SourceAnalyticsItem }) {
    if (sortKey !== k) return null;
    return sortAsc
      ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 inline ml-0.5" />;
  }

  const quickRanges = [
    { label: "Today",      f: todayISO(),      t: todayISO() },
    { label: "This Week",  f: (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); })(), t: todayISO() },
    { label: "This Month", f: monthStartISO(), t: todayISO() },
    { label: "This Year",  f: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), t: todayISO() },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Source Analytics</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Lead source performance + campaign breakdown
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {quickRanges.map((r) => {
                const active = dateFrom === r.f && dateTo === r.t;
                return (
                  <button
                    key={r.label}
                    onClick={() => { setDateFrom(r.f); setDateTo(r.t); }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-36 text-xs [color-scheme:dark]"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-36 text-xs [color-scheme:dark]"
                />
              </div>

              {isSuperAdmin && (teamsData?.data?.length ?? 0) > 0 && (
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {(teamsData?.data ?? []).map((t) => (
                      <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={BarChart3}
              label="Total Leads"
              value={fmt(summary.totalLeads)}
              color="bg-primary/10 text-primary"
              delay={0.1}
            />
            <SummaryCard
              icon={Target}
              label="Best Source"
              value={summary.bestSource}
              sub={`${summary.topConversion}% conversion`}
              color="bg-green-500/10 text-green-400"
              delay={0.15}
            />
            <SummaryCard
              icon={IndianRupee}
              label="Total Revenue"
              value={fmtRupee(summary.totalRevenue)}
              color="bg-teal-500/10 text-teal-400"
              delay={0.2}
            />
            <SummaryCard
              icon={TrendingUp}
              label="Active Sources"
              value={String(data.length)}
              color="bg-violet-500/10 text-violet-400"
              delay={0.25}
            />
          </div>

          {data.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Leads by Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="source"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={((value: unknown, name: string) => [
                          fmt(Number(value ?? 0)),
                          name === "total" ? "Total" : name === "closed" ? "Closed" : "Booking",
                        ]) as never}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {data.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Source Breakdown
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Click a row to see campaign breakdown
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    No leads found for this date range.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                            <th
                              key={k}
                              className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors select-none"
                              onClick={() => toggleSort(k)}
                            >
                              {label}
                              <SortIcon k={k} />
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right">Campaigns</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <AnimatePresence>
                          {sorted.map((row, i) => {
                            const isSelected = selectedSource === row.source;
                            return (
                              <>
                                <motion.tr
                                  key={row.source}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  onClick={() =>
                                    setSelectedSource(isSelected ? null : row.source)
                                  }
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-primary/10"
                                      : "hover:bg-muted/20"
                                  }`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                                      />
                                      <span className="font-medium capitalize">{row.source}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold">{fmt(row.total)}</td>
                                  <td className="px-4 py-3 text-right text-green-400">{fmt(row.closed)}</td>
                                  <td className="px-4 py-3 text-right text-teal-400">
                                    {fmt(row.booking + row.partialbooking)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span
                                      className={`font-semibold ${
                                        row.conversionRate >= 15
                                          ? "text-green-400"
                                          : row.conversionRate >= 5
                                          ? "text-yellow-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      {row.conversionRate}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-muted-foreground">{row.bookingRate}%</span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-primary font-medium">
                                    {fmtRupee(row.revenue)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSource(isSelected ? null : row.source);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                                    >
                                      <ArrowUpRight className="h-3 w-3" />
                                      View
                                    </button>
                                  </td>
                                </motion.tr>

                                {isSelected && (
                                  <tr key={`${row.source}-campaigns`}>
                                    <td colSpan={8} className="px-4 py-3 bg-muted/10">
                                      <AnimatePresence>
                                        <CampaignPanel
                                          source={row.source}
                                          dateFrom={dateFrom}
                                          dateTo={dateTo}
                                          onClose={() => setSelectedSource(null)}
                                        />
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

export default function SourceAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SourceAnalyticsContent />
    </Suspense>
  );
}
