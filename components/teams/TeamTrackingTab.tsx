"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, TrendingUp, Users, Calendar,
  ChevronDown, ChevronUp, ChevronsUpDown,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import { cn }      from "@/lib/utils";
import { useTeamTracking, type TeamTrackingRow } from "@/hooks/useTeams";

// ── Types & constants ─────────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "year" | "custom";

interface PeriodOption { id: Period; label: string }

const PERIODS: PeriodOption[] = [
  { id: "today",  label: "Today"      },
  { id: "week",   label: "This Week"  },
  { id: "month",  label: "This Month" },
  { id: "year",   label: "This Year"  },
  { id: "custom", label: "Custom"     },
];

const ACTION_COLS = [
  { key: "lead_created"   as const, label: "Created",        color: "bg-blue-500/20 text-blue-500"       },
  { key: "status_changed" as const, label: "Status Changed", color: "bg-violet-500/20 text-violet-500"   },
  { key: "call_made"      as const, label: "Calls Made",     color: "bg-teal-500/20 text-teal-500"       },
  { key: "note_added"     as const, label: "Notes Added",    color: "bg-amber-500/20 text-amber-500"     },
  { key: "lead_assigned"  as const, label: "Assigned",       color: "bg-green-500/20 text-green-500"     },
  { key: "lead_updated"   as const, label: "Updated",        color: "bg-slate-500/20 text-slate-400"     },
] as const;

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

function getRangeForPeriod(period: Exclude<Period, "custom">): { dateFrom: string; dateTo: string } {
  const now   = new Date();
  const today = toISO(now);
  if (period === "today") return { dateFrom: today, dateTo: today };
  if (period === "week") {
    const diff = (now.getDay() + 6) % 7;
    const mon  = new Date(now); mon.setDate(now.getDate() - diff);
    return { dateFrom: toISO(mon), dateTo: today };
  }
  if (period === "month") {
    return { dateFrom: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: today };
  }
  return { dateFrom: toISO(new Date(now.getFullYear(), 0, 1)), dateTo: today };
}

// ── Sort ──────────────────────────────────────────────────────────────────────

type SortKey = keyof Omit<TeamTrackingRow, "userId" | "email" | "designation" | "isActive">;

// ── Main component ────────────────────────────────────────────────────────────

interface TeamTrackingTabProps { teamId: string }

export function TeamTrackingTab({ teamId }: TeamTrackingTabProps) {
  const [period,   setPeriod]   = useState<Period>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [sortKey,  setSortKey]  = useState<SortKey>("total");
  const [sortAsc,  setSortAsc]  = useState(false);

  const { effectiveFrom, effectiveTo } = useMemo(() => {
    if (period === "custom") return { effectiveFrom: dateFrom, effectiveTo: dateTo };
    const r = getRangeForPeriod(period);
    return { effectiveFrom: r.dateFrom, effectiveTo: r.dateTo };
  }, [period, dateFrom, dateTo]);

  const { data: rows = [], isLoading } = useTeamTracking(
    teamId,
    effectiveFrom || undefined,
    effectiveTo   || undefined,
  );

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey as keyof TeamTrackingRow] as number | string;
      const bv = b[sortKey as keyof TeamTrackingRow] as number | string;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rows, sortKey, sortAsc]);

  const totals = useMemo(() => {
    const t: Record<string, number> = { total: 0 };
    for (const col of ACTION_COLS) t[col.key] = 0;
    for (const r of rows) {
      t.total += r.total;
      for (const col of ACTION_COLS) t[col.key] += r[col.key];
    }
    return t;
  }, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={11} className="text-muted-foreground/50" />;
    return sortAsc
      ? <ChevronUp size={11} className="text-primary" />
      : <ChevronDown size={11} className="text-primary" />;
  }

  const activeCount = rows.filter((r) => r.total > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Activity Tracking</h3>
            <p className="text-xs text-muted-foreground">Unique leads touched per member, per action</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Users size={11} /> {rows.length} members
          </Badge>
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <TrendingUp size={11} /> {totals.total} total touches
          </Badge>
          {activeCount > 0 && (
            <Badge className="gap-1.5 text-xs bg-primary/15 text-primary border-primary/30">
              {activeCount} active
            </Badge>
          )}
        </div>
      </div>

      {/* ── Period tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              period === p.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Custom date range ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {period === "custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">From</span>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">To</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  Clear
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Info callout ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground">
        <Activity size={12} className="mt-0.5 shrink-0 text-primary" />
        <span>Each number = unique leads that member acted on. Updating the same lead 5 times still counts as <strong className="text-foreground">1</strong>.</span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/60">
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Member <SortIcon col="name" />
                  </button>
                </th>
                <th className="px-3 py-3 text-center font-semibold text-muted-foreground uppercase tracking-wide">
                  <button onClick={() => toggleSort("total")} className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                    Unique Leads <SortIcon col="total" />
                  </button>
                </th>
                {ACTION_COLS.map((col) => (
                  <th key={col.key} className="px-2 py-3 text-center font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                      {col.label} <SortIcon col={col.key} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="sticky left-0 bg-card px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-muted" />
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-muted rounded" />
                          <div className="h-2 w-16 bg-muted rounded" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-3 text-center">
                        <div className="h-5 w-8 bg-muted rounded mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground text-sm">
                    <Activity size={32} className="mx-auto mb-2 opacity-30" />
                    No activity recorded for this period
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => (
                  <motion.tr
                    key={row.userId}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    {/* Member name */}
                    <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/30 transition-colors px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                          row.total > 0 ? "bg-primary/10" : "bg-muted",
                        )}>
                          <span className={cn("text-[10px] font-bold", row.total > 0 ? "text-primary" : "text-muted-foreground")}>
                            {row.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[120px]">{row.name}</p>
                          {row.designation && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{row.designation}</p>
                          )}
                        </div>
                        {!row.isActive && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                    </td>

                    {/* Total unique leads */}
                    <td className="px-3 py-3 text-center">
                      {row.total > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md font-bold bg-primary/15 text-primary">
                          {row.total}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Per-action columns */}
                    {ACTION_COLS.map((col) => {
                      const val = row[col.key];
                      return (
                        <td key={col.key} className="px-2 py-3 text-center">
                          {val > 0 ? (
                            <span className={cn("inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md font-semibold", col.color)}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))
              )}
            </tbody>

            {/* Totals footer */}
            {!isLoading && sorted.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border/60 bg-muted/30 font-semibold">
                  <td className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-sm">Team Total</td>
                  <td className="px-3 py-3 text-center font-bold text-foreground">{totals.total}</td>
                  {ACTION_COLS.map((col) => (
                    <td key={col.key} className="px-2 py-3 text-center">
                      {totals[col.key] > 0 ? (
                        <span className={cn("inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md font-semibold", col.color)}>
                          {totals[col.key]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </motion.div>
  );
}
