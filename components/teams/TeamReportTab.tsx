"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, TrendingUp, Users, Calendar,
  ChevronDown, ChevronUp, ChevronsUpDown,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import { cn }      from "@/lib/utils";
import { useTeamMemberReport, type TeamMemberReportRow } from "@/hooks/useTeams";

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

const STATUSES = [
  { key: "new",            label: "New",             color: "bg-blue-500/20 text-blue-500"       },
  { key: "assigned",       label: "Assigned",        color: "bg-amber-500/20 text-amber-500"     },
  { key: "followup",       label: "Follow Up",       color: "bg-purple-500/20 text-purple-500"   },
  { key: "interested",     label: "Interested",      color: "bg-violet-500/20 text-violet-500"   },
  { key: "cnc",            label: "CNC",             color: "bg-slate-500/20 text-slate-400"     },
  { key: "booking",        label: "Booking",         color: "bg-teal-500/20 text-teal-500"       },
  { key: "partialbooking", label: "Part.Booking",    color: "bg-pink-500/20 text-pink-500"       },
  { key: "closed",         label: "Closed",          color: "bg-green-500/20 text-green-500"     },
  { key: "rejected",       label: "Rejected",        color: "bg-red-500/20 text-red-500"         },
  { key: "rnr",            label: "RNR",             color: "bg-amber-500/20 text-amber-400"     },
  { key: "callback",       label: "Call Back",       color: "bg-sky-500/20 text-sky-500"         },
  { key: "whatsapp",       label: "WhatsApp",        color: "bg-emerald-500/20 text-emerald-500" },
  { key: "student",        label: "Student",         color: "bg-indigo-500/20 text-indigo-500"   },
] as const;

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getRangeForPeriod(period: Exclude<Period, "custom">): { dateFrom: string; dateTo: string } {
  const now   = new Date();
  const today = toISO(now);

  if (period === "today") return { dateFrom: today, dateTo: today };

  if (period === "week") {
    const day  = now.getDay(); // 0 = Sun
    const diff = (day + 6) % 7; // Mon-based
    const mon  = new Date(now); mon.setDate(now.getDate() - diff);
    return { dateFrom: toISO(mon), dateTo: today };
  }

  if (period === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toISO(first), dateTo: today };
  }

  // year
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return { dateFrom: toISO(jan1), dateTo: today };
}

// ── Sorting helper ────────────────────────────────────────────────────────────

type SortKey = "name" | "total" | keyof Omit<TeamMemberReportRow, "userId" | "name" | "email" | "designation" | "isActive">;

// ── Main component ────────────────────────────────────────────────────────────

interface TeamReportTabProps {
  teamId: string;
}

export function TeamReportTab({ teamId }: TeamReportTabProps) {
  const [period,    setPeriod]    = useState<Period>("month");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [sortKey,   setSortKey]   = useState<SortKey>("total");
  const [sortAsc,   setSortAsc]   = useState(false);

  // Resolve effective date range
  const { effectiveFrom, effectiveTo } = useMemo(() => {
    if (period === "custom") return { effectiveFrom: dateFrom, effectiveTo: dateTo };
    const range = getRangeForPeriod(period);
    return { effectiveFrom: range.dateFrom, effectiveTo: range.dateTo };
  }, [period, dateFrom, dateTo]);

  const { data: rows = [], isLoading } = useTeamMemberReport(
    teamId,
    effectiveFrom || undefined,
    effectiveTo   || undefined,
  );

  // Sort
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey as keyof TeamMemberReportRow] as number | string;
      const bv = b[sortKey as keyof TeamMemberReportRow] as number | string;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rows, sortKey, sortAsc]);

  // Totals row
  const totals = useMemo(() => {
    const t: Record<string, number> = { total: 0 };
    for (const s of STATUSES) t[s.key] = 0;
    for (const r of rows) {
      t.total += r.total;
      for (const s of STATUSES) t[s.key] += r[s.key as keyof TeamMemberReportRow] as number;
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
            <BarChart3 size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Member Report</h3>
            <p className="text-xs text-muted-foreground">Lead status breakdown per member</p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Users size={11} /> {rows.length} members
          </Badge>
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <TrendingUp size={11} /> {totals.total} total leads
          </Badge>
          {totals.closed > 0 && (
            <Badge className="gap-1.5 text-xs bg-green-500/15 text-green-600 border-green-500/30">
              {totals.closed} closed
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
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                >
                  Clear
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            {/* Head */}
            <thead>
              <tr className="bg-muted/50 border-b border-border/60">
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Member <SortIcon col="name" />
                  </button>
                </th>
                <th className="px-3 py-3 text-center font-semibold text-muted-foreground uppercase tracking-wide">
                  <button
                    onClick={() => toggleSort("total")}
                    className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors"
                  >
                    Total <SortIcon col="total" />
                  </button>
                </th>
                {STATUSES.map((s) => (
                  <th key={s.key} className="px-2 py-3 text-center font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    <button
                      onClick={() => toggleSort(s.key as SortKey)}
                      className="flex items-center gap-1 mx-auto hover:text-foreground transition-colors"
                    >
                      {s.label} <SortIcon col={s.key as SortKey} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
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
                    {Array.from({ length: 14 }).map((_, j) => (
                      <td key={j} className="px-3 py-3 text-center">
                        <div className="h-5 w-8 bg-muted rounded mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-muted-foreground text-sm">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                    No lead data for this period
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
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">
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
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-foreground">{row.total}</span>
                    </td>

                    {/* Status columns */}
                    {STATUSES.map((s) => {
                      const val = row[s.key as keyof TeamMemberReportRow] as number;
                      return (
                        <td key={s.key} className="px-2 py-3 text-center">
                          {val > 0 ? (
                            <span className={cn("inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md font-semibold", s.color)}>
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
                  <td className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-sm">
                    Team Total
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-foreground">{totals.total}</td>
                  {STATUSES.map((s) => (
                    <td key={s.key} className="px-2 py-3 text-center">
                      {totals[s.key] > 0 ? (
                        <span className={cn("inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md font-semibold", s.color)}>
                          {totals[s.key]}
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
