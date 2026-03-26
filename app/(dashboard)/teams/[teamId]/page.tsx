"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Shuffle,
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  Trophy,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  UserCheck,
  ArrowRightLeft,
  Activity,
  GitBranch,
  StickyNote,
  Edit3,
  Trash2,
  AlertTriangle,
  Star,
  Medal,
  BarChart3,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  Tags,
  X,
  Filter,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useTeam,
  useTeamLeads,
  useTeamMemberStats,
  useAutoAssignTeamLeads,
  useTeams,
  useDeleteTeam,
  useMyTeam,
  useBulkAssignTeamLeadsToMember,
  useBulkTransferTeamLeads,
  useBulkUpdateTeamLeadsStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useTeamDashboard,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useTeamLogs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useAssignLeadToMember,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useTransferLead,
} from "@/hooks/useTeams";
import { useAuthStore } from "@/lib/store/authStore";
import { formatDate, getInitials } from "@/lib/utils";
import type { Team, TeamMemberStat } from "@/types/team";
import type { Lead, LeadStatus } from "@/types/lead";
import type { User } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamDashboardData {
  statusDistribution: {
    total: number;
    new: number;
    assigned: number;
    followup: number;
    closed: number;
    rejected: number;
    unassigned: number;
    cnc: number;
    booking: number;
    interested: number;
  };
  memberRankings: Array<{
    user: Pick<User, "_id" | "name" | "email" | "designation">;
    total: number;
    assigned: number;
    followup: number;
    closed: number;
    rejected: number;
    cnc: number;
    booking: number;
    interested: number;
    closureRate: number;
  }>;
}

interface TeamLog {
  _id: string;
  action: string;
  description: string;
  performedBy: { name: string; email: string } | string;
  leadId?: string;
  leadName?: string;
  createdAt: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = "dashboard" | "members" | "leads" | "logs";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "members", label: "Members" },
  { id: "leads", label: "Leads" },
  { id: "logs", label: "Logs" },
];

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; dot: string; bar: string; text: string }
> = {
  new: {
    label: "New",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    dot: "bg-blue-400",
    bar: "bg-blue-500",
    text: "text-blue-400",
  },
  assigned: {
    label: "Assigned",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    bar: "bg-amber-500",
    text: "text-amber-400",
  },
  followup: {
    label: "Follow Up",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    dot: "bg-purple-400",
    bar: "bg-purple-500",
    text: "text-purple-400",
  },
  closed: {
    label: "Closed",
    color: "bg-green-500/15 text-green-400 border-green-500/30",
    dot: "bg-green-400",
    bar: "bg-green-500",
    text: "text-green-400",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    dot: "bg-red-400",
    bar: "bg-red-500",
    text: "text-red-400",
  },
  cnc: {
    label: "CNC",
    color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
    bar: "bg-slate-500",
    text: "text-slate-400",
  },
  booking: {
    label: "Booking",
    color: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    dot: "bg-teal-400",
    bar: "bg-teal-500",
    text: "text-teal-400",
  },
  interested: {
    label: "Interested",
    color: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    dot: "bg-violet-400",
    bar: "bg-violet-500",
    text: "text-violet-400",
  },
};

const LOG_ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  lead_created: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
  lead_updated: { icon: Edit3, color: "text-amber-400", bg: "bg-amber-500/10" },
  status_changed: { icon: GitBranch, color: "text-purple-400", bg: "bg-purple-500/10" },
  lead_assigned: { icon: UserCheck, color: "text-green-400", bg: "bg-green-500/10" },
  team_assigned: { icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  note_added: { icon: StickyNote, color: "text-teal-400", bg: "bg-teal-500/10" },
  note_updated: { icon: StickyNote, color: "text-teal-400", bg: "bg-teal-500/10" },
  note_deleted: { icon: StickyNote, color: "text-red-400", bg: "bg-red-500/10" },
};

const DEFAULT_LOG_CONFIG = { icon: Activity, color: "text-muted-foreground", bg: "bg-muted" };

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ClosureRateBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate);
  const cls =
    pct >= 50
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : pct >= 20
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {pct}%
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-2.5 w-24 rounded bg-muted" />
      </div>
      <div className="h-3 w-16 rounded bg-muted" />
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({
  teamId,
  team,
  isLeaderOrAdmin,
  onAutoAssign,
  assigning,
}: {
  teamId: string;
  team: Team;
  isLeaderOrAdmin: boolean;
  onAutoAssign: () => void;
  assigning: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dashData, isLoading } = (useTeamDashboard as any)(teamId) as {
    data: TeamDashboardData | undefined;
    isLoading: boolean;
  };

  const dist = dashData?.statusDistribution;
  const rankings = dashData?.memberRankings ?? [];
  const total = dist?.total ?? 0;

  const statCards = [
    {
      title: "Total Leads",
      value: total,
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      title: "Unassigned",
      value: dist?.unassigned ?? 0,
      icon: Target,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Closed",
      value: dist?.closed ?? 0,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      title: "Rejection Rate",
      value:
        total > 0
          ? `${Math.round(((dist?.rejected ?? 0) / total) * 100)}%`
          : "0%",
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  const statusBars: Array<{ key: LeadStatus; label: string }> = [
    { key: "new",        label: "New" },
    { key: "assigned",   label: "Assigned" },
    { key: "followup",   label: "Follow Up" },
    { key: "interested", label: "Interested" },
    { key: "cnc",        label: "CNC" },
    { key: "booking",    label: "Booking" },
    { key: "closed",     label: "Closed" },
    { key: "rejected",   label: "Rejected" },
  ];

  const medalColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
  const medalBgs = ["bg-yellow-400/10", "bg-slate-400/10", "bg-amber-600/10"];

  const sortedRankings = useMemo(
    () => [...rankings].sort((a, b) => b.closed - a.closed),
    [rankings]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{team.name}</h2>
          <Badge
            variant={team.status === "active" ? "default" : "secondary"}
            className="capitalize shrink-0"
          >
            {team.status}
          </Badge>
        </div>
        {/* {isLeaderOrAdmin && (
          <Button
            size="sm"
            onClick={onAutoAssign}
            disabled={assigning}
            className="gap-2"
          >
            {assigning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Shuffle className="h-3.5 w-3.5" />
            )}
            Auto-assign Leads
          </Button>
        )} */}
      </div>

      {/* Stat cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card) => (
          <motion.div key={card.title} variants={itemVariants}>
            <Card className={`border-border/50 hover:border-border transition-colors`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-1.5 ${card.bg}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Status distribution */}
      <motion.div variants={fadeIn} initial="hidden" animate="show">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusBars.map(({ key, label }) => {
              const count = dist?.[key] ?? 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const cfg = STATUS_CONFIG[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                      className={`h-full rounded-full ${cfg.bar}`}
                    />
                  </div>
                  <span className={`w-8 shrink-0 text-right text-xs font-medium ${cfg.text}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Member rankings */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedRankings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No performance data yet.
              </p>
            ) : (
              sortedRankings.map((member, idx) => {
                const isMedal = idx < 3;
                const medalColor = isMedal ? medalColors[idx] : "text-muted-foreground";
                const medalBg = isMedal ? medalBgs[idx] : "bg-muted";
                const closureRate = member.closureRate ?? (member.total > 0 ? (member.closed / member.total) * 100 : 0);

                return (
                  <motion.div
                    key={member.user._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/20 transition-colors"
                  >
                    {/* Rank badge */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${medalBg}`}
                    >
                      {isMedal ? (
                        <Medal className={`h-3.5 w-3.5 ${medalColor}`} />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(member.user.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.user.name}
                      </p>
                      {member.user.designation && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user.designation}
                        </p>
                      )}
                      {/* Closure rate bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(closureRate, 100)}%` }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.05 + 0.2 }}
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {Math.round(closureRate)}%
                        </span>
                      </div>
                    </div>

                    {/* Stat chips — 2 on mobile, 4 on sm+ */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {[
                        { label: "Total",    value: member.total,   cls: "text-foreground",  show: "always" },
                        { label: "Active",   value: member.assigned + member.followup + (member.cnc ?? 0) + (member.booking ?? 0) + (member.interested ?? 0), cls: "text-amber-400",  show: "sm" },
                        { label: "Closed",   value: member.closed,  cls: "text-green-400",  show: "always" },
                        { label: "Rejected", value: member.rejected,cls: "text-red-400",    show: "sm" },
                      ].map(({ label, value, cls, show }) => (
                        <div
                          key={label}
                          className={`flex flex-col items-center rounded bg-muted/60 px-1.5 sm:px-2 py-1 min-w-[32px] sm:min-w-[38px] ${show === "sm" ? "hidden sm:flex" : ""}`}
                        >
                          <span className={`text-xs font-bold ${cls}`}>{value}</span>
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({
  team,
  memberStats,
  isLoading,
}: {
  team: Team;
  memberStats: TeamMemberStat[] | undefined;
  isLoading: boolean;
}) {
  const leaderIds = new Set((team.leaders ?? []).map((l) => l._id));

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-border/50">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : !memberStats || memberStats.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No members in this team yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-center w-12">Rank</th>
                    <th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Role</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Assigned</th>
                    <th className="px-4 py-3 text-center hidden md:table-cell">Follow Up</th>
                    <th className="px-4 py-3 text-center hidden lg:table-cell">Interested</th>
                    <th className="px-4 py-3 text-center hidden lg:table-cell">CNC</th>
                    <th className="px-4 py-3 text-center hidden xl:table-cell">Booking</th>
                    <th className="px-4 py-3 text-center">Closed</th>
                    <th className="px-4 py-3 text-center hidden lg:table-cell">Rejected</th>
                    <th className="px-4 py-3 text-center">Closure Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[...memberStats]
                    .sort((a, b) => b.closed - a.closed)
                    .map((stat, idx) => {
                      const isLeader = leaderIds.has(stat.user._id);
                      const closureRate =
                        stat.total > 0 ? Math.round((stat.closed / stat.total) * 100) : 0;
                      return (
                        <motion.tr
                          key={stat.user._id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-semibold text-muted-foreground">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(stat.user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {stat.user.name}
                                  </p>
                                  {isLeader && (
                                    <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {stat.user.designation ?? stat.user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            {isLeader ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/30 text-amber-400 text-[10px]"
                              >
                                <Crown className="h-2.5 w-2.5" />
                                Leader
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Member
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-semibold">{stat.total}</span>
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            <span className="text-sm text-amber-400">{stat.assigned}</span>
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            <span className="text-sm text-purple-400">{stat.followup}</span>
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            <span className="text-sm text-violet-400">{stat.interested ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            <span className="text-sm text-slate-400">{stat.cnc ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center hidden xl:table-cell">
                            <span className="text-sm text-teal-400">{stat.booking ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-green-400 font-medium">{stat.closed}</span>
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            <span className="text-sm text-red-400">{stat.rejected}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ClosureRateBadge rate={closureRate} />
                          </td>
                        </motion.tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────

function LeadsTab({
  teamId,
  team,
  isLeaderOrAdmin,
  onAutoAssign,
  assigning,
}: {
  teamId: string;
  team: Team;
  isLeaderOrAdmin: boolean;
  onAutoAssign: () => void;
  assigning: boolean;
}) {
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [reporterFilter, setReporterFilter] = useState<string>("all");
  const [dateFrom, setDateFrom]           = useState<string>("");
  const [dateTo, setDateTo]               = useState<string>("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [showFilters, setShowFilters]     = useState(false);
  const [page, setPage]                   = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [transferLeadId, setTransferLeadId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // ── Bulk selection ────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkMemberId, setBulkMemberId] = useState<string>("");
  const [bulkNewTeamId, setBulkNewTeamId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("followup");

  const bulkAssignMutation   = useBulkAssignTeamLeadsToMember(teamId);
  const bulkTransferMutation = useBulkTransferTeamLeads(teamId);
  const bulkStatusMutation   = useBulkUpdateTeamLeadsStatus(teamId);

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll(ids: string[]) {
    setSelectedIds((prev) =>
      ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)
    );
  }

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, debouncedSearch, statusFilter, assigneeFilter, reporterFilter, dateFrom, dateTo, unassignedOnly]);

  function applyFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function clearAllFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setAssigneeFilter("all");
    setReporterFilter("all");
    setDateFrom("");
    setDateTo("");
    setUnassignedOnly(false);
    setPage(1);
  }

  const activeFilterCount = [
    statusFilter   !== "all",
    assigneeFilter !== "all",
    reporterFilter !== "all",
    !!dateFrom,
    !!dateTo,
    unassignedOnly,
    !!debouncedSearch,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const { data: leadsResult, isLoading, isFetching } = useTeamLeads(teamId, {
    search:      debouncedSearch || undefined,
    status:      statusFilter   !== "all" ? (statusFilter as LeadStatus) : undefined,
    assignedTo:  assigneeFilter !== "all" ? assigneeFilter               : undefined,
    reporter:    reporterFilter !== "all" ? reporterFilter               : undefined,
    dateFrom:    dateFrom  || undefined,
    dateTo:      dateTo    || undefined,
    unassignedOnly,
    page,
    limit: 10,
  });

  const { data: allTeamsResult } = useTeams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignMutation = (useAssignLeadToMember as any)(teamId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transferMutation = (useTransferLead as any)(teamId);

  const leads = leadsResult?.data ?? [];
  const pagination = leadsResult?.pagination;

  const allMembers: User[] = useMemo(
    () =>
      [
        ...(team?.leaders ?? []),
        ...(team?.members ?? []),
      ].filter((u, i, arr) => arr.findIndex((x) => x._id === u._id) === i),
    [team]
  );

  const otherTeams = (allTeamsResult?.data ?? []).filter((t: Team) => t._id !== teamId);

  function handleAssign(leadId: string) {
    if (!selectedMemberId) return;
    assignMutation.mutate(
      { leadId, memberId: selectedMemberId },
      {
        onSuccess: () => {
          setAssigningLeadId(null);
          setSelectedMemberId("");
        },
      }
    );
  }

  function handleTransfer(leadId: string) {
    if (!selectedTeamId) return;
    transferMutation.mutate(
      { leadId, newTeamId: selectedTeamId },
      {
        onSuccess: () => {
          setTransferLeadId(null);
          setSelectedTeamId("");
        },
      }
    );
  }

  const canActOnLead = (lead: Lead) =>
    isLeaderOrAdmin && lead.status !== "closed" && lead.status !== "rejected";

  return (
    <div className="space-y-4">
      {/* ── Filter Card ────────────────────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 space-y-3">

          {/* Row 1 — Search + Filter toggle + Auto-assign */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="gap-2 relative"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </Button>
              )}
              {isLeaderOrAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAutoAssign}
                  disabled={assigning}
                  className="gap-2 shrink-0"
                >
                  {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
                  Auto-assign
                </Button>
              )}
            </div>
          </div>

          {/* Row 2 — Expandable filter panel */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-5">

                  {/* Status */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <Select value={statusFilter} onValueChange={(v) => applyFilter(setStatusFilter, v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assigned To */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
                    <Select value={assigneeFilter} onValueChange={(v) => applyFilter(setAssigneeFilter, v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Members" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">All Members</SelectItem>
                        {allMembers.map((m) => (
                          <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unassigned only toggle (inside panel) */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Availability</p>
                    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm select-none hover:bg-muted/30 transition-colors">
                      <Checkbox
                        checked={unassignedOnly}
                        onCheckedChange={(v) => { setUnassignedOnly(!!v); setPage(1); }}
                      />
                      Unassigned only
                    </label>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Date Range (Created)
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="date"
                        value={dateFrom}
                        max={dateTo || undefined}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="h-9 text-sm px-2 flex-1 [color-scheme:dark]"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">to</span>
                      <Input
                        type="date"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="h-9 text-sm px-2 flex-1 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Row 3 — Active filter pills */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-1.5"
            >
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Search: &quot;{debouncedSearch}&quot;
                  <button onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }} className="ml-0.5 hover:text-primary/60"><X className="h-3 w-3" /></button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Status: {STATUS_CONFIG[statusFilter as LeadStatus]?.label ?? statusFilter}
                  <button onClick={() => applyFilter(setStatusFilter, "all")} className="ml-0.5 hover:text-primary/60"><X className="h-3 w-3" /></button>
                </span>
              )}
              {assigneeFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Assigned: {allMembers.find((m) => m._id === assigneeFilter)?.name ?? assigneeFilter}
                  <button onClick={() => applyFilter(setAssigneeFilter, "all")} className="ml-0.5 hover:text-primary/60"><X className="h-3 w-3" /></button>
                </span>
              )}
              {unassignedOnly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Unassigned only
                  <button onClick={() => { setUnassignedOnly(false); setPage(1); }} className="ml-0.5 hover:text-primary/60"><X className="h-3 w-3" /></button>
                </span>
              )}
              {dateFrom && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  From: {dateFrom}
                  <button onClick={() => { setDateFrom(""); setPage(1); }} className="ml-0.5 hover:text-primary/60"><X className="h-3 w-3" /></button>
                </span>
              )}
              {dateTo && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  To: {dateTo}
                  <button onClick={() => { setDateTo(""); setPage(1); }} className="ml-0.5 hover:text-primary/60"><X className="h-3 w-3" /></button>
                </span>
              )}
            </motion.div>
          )}
        </CardHeader>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 px-6 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Team Leads
            {pagination && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {pagination.total}
              </span>
            )}
            {isFetching && !isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="pl-4 pr-2 py-3 w-10">
                      <Checkbox
                        checked={leads.length > 0 && leads.every((l) => selectedIds.has(l._id))}
                        onCheckedChange={() => toggleAll(leads.map((l) => l._id))}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Lead</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Assigned To</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Source</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {leads.map((lead, i) => {
                    const assignedTo =
                      lead.assignedTo && typeof lead.assignedTo === "object"
                        ? (lead.assignedTo as User)
                        : null;
                    return (
                      <motion.tr
                        key={lead._id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`hover:bg-muted/20 transition-colors group ${selectedIds.has(lead._id) ? "bg-primary/5" : ""}`}
                      >
                        <td className="pl-4 pr-2 py-3">
                          <Checkbox
                            checked={selectedIds.has(lead._id)}
                            onCheckedChange={() => toggleId(lead._id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Select lead"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{lead.name}</p>
                            {lead.email && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {lead.phone ? (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getInitials(assignedTo.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground">{assignedTo.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground capitalize">
                            {lead.source ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(lead.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {/* View */}
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                              <Link href={`/leads/${lead._id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>

                            {/* Assign to member */}
                            {canActOnLead(lead) && (
                              <Dialog
                                open={assigningLeadId === lead._id}
                                onOpenChange={(open) => {
                                  setAssigningLeadId(open ? lead._id : null);
                                  if (!open) setSelectedMemberId("");
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                    title="Assign to member"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm">
                                  <DialogHeader>
                                    <DialogTitle className="text-base">Assign Lead</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-2">
                                    <p className="text-sm text-muted-foreground">
                                      Assign <span className="font-medium text-foreground">{lead.name}</span> to:
                                    </p>
                                    <Select
                                      value={selectedMemberId}
                                      onValueChange={setSelectedMemberId}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select a member..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {allMembers.map((m) => (
                                          <SelectItem key={m._id} value={m._id}>
                                            {m.name}
                                            {m.designation && (
                                              <span className="text-muted-foreground ml-1.5 text-xs">
                                                · {m.designation}
                                              </span>
                                            )}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setAssigningLeadId(null);
                                          setSelectedMemberId("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={!selectedMemberId || assignMutation.isPending}
                                        onClick={() => handleAssign(lead._id)}
                                      >
                                        {assignMutation.isPending ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          "Assign"
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}

                            {/* Transfer team */}
                            {isLeaderOrAdmin && (
                              <Dialog
                                open={transferLeadId === lead._id}
                                onOpenChange={(open) => {
                                  setTransferLeadId(open ? lead._id : null);
                                  if (!open) setSelectedTeamId("");
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                    title="Transfer to another team"
                                  >
                                    <ArrowRightLeft className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm">
                                  <DialogHeader>
                                    <DialogTitle className="text-base">Transfer Lead</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-2">
                                    <p className="text-sm text-muted-foreground">
                                      Transfer <span className="font-medium text-foreground">{lead.name}</span> to another team:
                                    </p>
                                    <Select
                                      value={selectedTeamId}
                                      onValueChange={setSelectedTeamId}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select a team..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {otherTeams.map((t: Team) => (
                                          <SelectItem key={t._id} value={t._id}>
                                            {t.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setTransferLeadId(null);
                                          setSelectedTeamId("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={!selectedTeamId || transferMutation.isPending}
                                        onClick={() => handleTransfer(lead._id)}
                                      >
                                        {transferMutation.isPending ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          "Transfer"
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border px-4 sm:px-6 py-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">{pagination.total}</span> leads
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline" size="sm"
                  className="gap-1"
                  disabled={!pagination.hasPrevPage || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
                <span className="text-sm font-medium px-1 tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline" size="sm"
                  className="gap-1"
                  disabled={!pagination.hasNextPage || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bulk: Assign to Member dialog ─────────────────────────────────────── */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign to Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Assign <span className="font-semibold text-foreground">{selectedIds.size}</span> lead(s) to:
          </p>
          <Select value={bulkMemberId} onValueChange={setBulkMemberId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              {allMembers.map((m) => (
                <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={!bulkMemberId || bulkAssignMutation.isPending}
              onClick={() => {
                if (!bulkMemberId) return;
                bulkAssignMutation.mutate(
                  { leadIds: Array.from(selectedIds), memberId: bulkMemberId },
                  { onSuccess: () => { setBulkAssignOpen(false); setSelectedIds(new Set()); setBulkMemberId(""); } },
                );
              }}
            >
              {bulkAssignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk: Transfer dialog ─────────────────────────────────────────────── */}
      <Dialog open={bulkTransferOpen} onOpenChange={setBulkTransferOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Leads</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Transfer <span className="font-semibold text-foreground">{selectedIds.size}</span> lead(s) to another team.
            Current member assignment will be cleared.
          </p>
          <Select value={bulkNewTeamId} onValueChange={setBulkNewTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Select target team" />
            </SelectTrigger>
            <SelectContent>
              {otherTeams.map((t: Team) => (
                <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkTransferOpen(false)}>Cancel</Button>
            <Button
              disabled={!bulkNewTeamId || bulkTransferMutation.isPending}
              onClick={() => {
                if (!bulkNewTeamId) return;
                bulkTransferMutation.mutate(
                  { leadIds: Array.from(selectedIds), newTeamId: bulkNewTeamId },
                  { onSuccess: () => { setBulkTransferOpen(false); setSelectedIds(new Set()); setBulkNewTeamId(""); } },
                );
              }}
            >
              {bulkTransferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk: Status dialog ───────────────────────────────────────────────── */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Change status for <span className="font-semibold text-foreground">{selectedIds.size}</span> lead(s)
          </p>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkStatusOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkStatusMutation.isPending}
              onClick={() => {
                bulkStatusMutation.mutate(
                  { leadIds: Array.from(selectedIds), status: bulkStatus },
                  { onSuccess: () => { setBulkStatusOpen(false); setSelectedIds(new Set()); } },
                );
              }}
            >
              {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Floating Bulk Action Bar ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl px-3 sm:px-4 py-2.5 sm:py-3">
              <div className="flex items-center gap-1.5 pr-2.5 sm:pr-3 border-r border-border shrink-0">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                  {selectedIds.size}
                  <span className="hidden sm:inline"> selected</span>
                </span>
              </div>
              {/* Assign to member */}
              {isLeaderOrAdmin && (
                <Button
                  variant="ghost" size="sm"
                  className="gap-1 sm:gap-1.5 h-8 text-xs px-2 sm:px-3 hover:bg-muted"
                  onClick={() => setBulkAssignOpen(true)}
                >
                  <UserCheck className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Assign</span>
                </Button>
              )}
              {/* Change status */}
              <Button
                variant="ghost" size="sm"
                className="gap-1 sm:gap-1.5 h-8 text-xs px-2 sm:px-3 hover:bg-muted"
                onClick={() => setBulkStatusOpen(true)}
              >
                <Tags className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Status</span>
              </Button>
              {/* Transfer */}
              {isLeaderOrAdmin && (
                <Button
                  variant="ghost" size="sm"
                  className="gap-1 sm:gap-1.5 h-8 text-xs px-2 sm:px-3 hover:bg-muted"
                  onClick={() => setBulkTransferOpen(true)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Transfer</span>
                </Button>
              )}
              {/* Clear */}
              <div className="pl-2 border-l border-border">
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab({ teamId }: { teamId: string }) {
  const [page, setPage] = useState(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logsResult, isLoading, isFetching } = (useTeamLogs as any)(teamId, page) as {
    data: { data: TeamLog[]; pagination: { total: number; page: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean; limit: number } } | undefined;
    isLoading: boolean;
    isFetching: boolean;
  };

  const logs = logsResult?.data ?? [];
  const pagination = logsResult?.pagination;

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Team Activity Logs
            {pagination && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {pagination.total}
              </span>
            )}
            {isFetching && !isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-border/50">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3 p-4 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 rounded bg-muted" />
                    <div className="h-2.5 w-64 rounded bg-muted" />
                    <div className="h-2 w-20 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No activity logs yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              <AnimatePresence mode="wait">
                {logs.map((log: TeamLog, i: number) => {
                  const cfg = LOG_ACTION_CONFIG[log.action] ?? DEFAULT_LOG_CONFIG;
                  const Icon = cfg.icon;
                  const performedBy =
                    typeof log.performedBy === "object"
                      ? log.performedBy.name
                      : log.performedBy ?? "System";

                  return (
                    <motion.div
                      key={log._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-3 px-4 py-4 hover:bg-muted/20 transition-colors"
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {performedBy}
                          </span>
                          {log.leadName && (
                            <>
                              <span className="text-xs text-muted-foreground">on lead</span>
                              {log.leadId ? (
                                <Link
                                  href={`/leads/${log.leadId}`}
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  {log.leadName}
                                </Link>
                              ) : (
                                <span className="text-xs font-medium text-foreground">
                                  {log.leadName}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {log.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          {timeAgo(log.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border px-4 sm:px-6 py-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Page{" "}
                <span className="font-medium text-foreground">{pagination.page}</span> of{" "}
                <span className="font-medium text-foreground">{pagination.totalPages}</span>
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline" size="sm" className="gap-1"
                  disabled={!pagination.hasPrevPage || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
                <span className="text-sm font-medium px-1 tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline" size="sm" className="gap-1"
                  disabled={!pagination.hasNextPage || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const { user, hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: team, isLoading: loadingTeam } = useTeam(teamId);
  const { data: memberStats, isLoading: loadingStats } = useTeamMemberStats(teamId);
  const { mutate: autoAssign, isPending: assigning } = useAutoAssignTeamLeads(teamId);
  const { mutate: deleteTeam, isPending: deleting } = useDeleteTeam();

  // ── Access control ───────────────────────────────────────────────────────────
  const isSuperAdmin =
    user?.role?.isSystemRole && user?.role?.roleName === "Super Admin";

  // Always call the hook (rules of hooks) — only redirect for non-super-admins
  const { data: myTeam, isLoading: myTeamLoading } = useMyTeam();

  // Once we know the user's team, redirect if they're trying to view another team
  useEffect(() => {
    if (isSuperAdmin || myTeamLoading || !myTeam) return;
    // If the page's teamId doesn't match the user's team → redirect to their team
    if (myTeam._id !== teamId) {
      router.replace(`/teams/${myTeam._id}`);
    }
  }, [isSuperAdmin, myTeamLoading, myTeam, teamId, router]);
  // ─────────────────────────────────────────────────────────────────────────────

  const isAdmin = hasPermission("leads", "edit");
  const isLeader =
    user &&
    team?.leaders?.some((l: User) => l._id === user._id);
  const isLeaderOrAdmin = isLeader || isAdmin;
  const canDelete = hasPermission("leads", "delete");

  // Leads + Logs tabs are only visible to: Super Admin, team leaders, and Reporters
  const isReporter =
    user?.role?.roleName === "Reporter" ||
    user?.role?.roleName === "reporter";
  const canSeeSensitiveTabs = isSuperAdmin || !!isLeader || isReporter;

  // If a regular member somehow lands on a restricted tab, bounce them to dashboard
  useEffect(() => {
    if (!canSeeSensitiveTabs && (activeTab === "leads" || activeTab === "logs")) {
      setActiveTab("dashboard");
    }
  }, [canSeeSensitiveTabs, activeTab]);

  const visibleTabs = TABS.filter(
    (tab) =>
      (tab.id !== "leads" && tab.id !== "logs") || canSeeSensitiveTabs,
  );

  function handleAutoAssign() {
    autoAssign(undefined);
  }

  function handleDelete() {
    deleteTeam(teamId, {
      onSuccess: () => router.push("/teams"),
    });
  }

  // ── Access guard: show spinner while checking for non-super-admins ───────────
  if (!isSuperAdmin && (myTeamLoading || (myTeam && myTeam._id !== teamId))) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Non-super-admin with no team at all → redirect to teams list
  if (!isSuperAdmin && !myTeamLoading && !myTeam) {
    router.replace("/teams");
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadingTeam) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">Team not found</p>
        <Button variant="outline" onClick={() => router.push("/teams")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Back button ── */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/teams")}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teams
        </Button>
      </motion.div>

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-border/50 overflow-hidden">
          <div className="h-14 sm:h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <CardContent className="relative pt-0 pb-5">
            <div className="-mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {/* Team icon + name */}
              <div className="flex items-end gap-3 sm:gap-4 min-w-0">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl border-4 border-background bg-primary/10 shadow-lg">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div className="pb-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{team.name}</h1>
                    <Badge
                      variant={team.status === "active" ? "default" : "secondary"}
                      className="capitalize shrink-0"
                    >
                      {team.status}
                    </Badge>
                  </div>
                  {team.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{team.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs text-muted-foreground">
                    {/* Leader names */}
                    {(team.leaders?.length ?? 0) > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                        {team.leaders.map((l: User) => (
                          <div key={l._id} className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px] bg-amber-500/15 text-amber-500">
                                {getInitials(l.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{l.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber-400 shrink-0" />
                        No leader assigned
                      </span>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 shrink-0" />
                      {team.members?.length ?? 0} member{(team.members?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      Created {formatDate(team.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-1 flex-wrap shrink-0">
                {/* {isLeaderOrAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoAssign}
                    disabled={assigning}
                    className="gap-2"
                  >
                    {assigning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Shuffle className="h-3.5 w-3.5" />
                    )}
                    Auto-assign
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/teams/${teamId}/edit`)}
                    className="gap-2"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete{" "}
                          <span className="font-semibold">{team.name}</span>? This action
                          cannot be undone. All leads assigned to this team will be unassigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={deleting}
                          className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                          {deleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                          ) : null}
                          Delete Team
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )} */}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Custom Tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Tab list — scrollable on mobile */}
        <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-none -mx-1 px-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "relative px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardTab
                teamId={teamId}
                team={team}
                isLeaderOrAdmin={!!isLeaderOrAdmin}
                onAutoAssign={handleAutoAssign}
                assigning={assigning}
              />
            </motion.div>
          )}

          {activeTab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <MembersTab
                team={team}
                memberStats={memberStats}
                isLoading={loadingStats}
              />
            </motion.div>
          )}

          {activeTab === "leads" && canSeeSensitiveTabs && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LeadsTab
                teamId={teamId}
                team={team}
                isLeaderOrAdmin={!!isLeaderOrAdmin}
                onAutoAssign={handleAutoAssign}
                assigning={assigning}
              />
            </motion.div>
          )}

          {activeTab === "logs" && canSeeSensitiveTabs && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LogsTab teamId={teamId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
