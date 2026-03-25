"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  FileText, Users, Clock, CheckCircle2, XCircle,
  TrendingUp, Search, Mail, Phone, Shield, Calendar,
  Activity, StickyNote, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/useUsers";
import { useUserLeads, useUserLeadStats } from "@/hooks/useLeads";
import { formatDate, getInitials } from "@/lib/utils";
import type { LeadStatus } from "@/types/lead";
import type { User } from "@/types";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; dot: string }> = {
  new: { label: "New", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
  assigned: { label: "Assigned", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-400" },
  followup: { label: "Follow Up", color: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-400" },
  closed: { label: "Closed", color: "bg-green-500/15 text-green-400 border-green-500/30", dot: "bg-green-400" },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-400" },
  cnc: { label: "CNC", color: "bg-slate-500/15 text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
  booking: { label: "Booking", color: "bg-teal-500/15 text-teal-400 border-teal-500/30", dot: "bg-teal-400" },
  interested: { label: "Interested", color: "bg-violet-500/15 text-violet-400 border-violet-500/30", dot: "bg-violet-400" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function InfoChip({
  icon: Icon, value,
}: { icon: React.ElementType; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: user, isLoading: userLoading } = useUser(userId);
  const { data: statsData, isLoading: statsLoading } = useUserLeadStats(userId);
  const {
    data: leadsData,
    isLoading: leadsLoading,
    isFetching,
  } = useUserLeads(userId, {
    page,
    limit: 10,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const leads = leadsData?.data ?? [];
  const pagination = leadsData?.pagination;
  const stats = statsData;

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => router.push("/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
        </Button>
      </div>
    );
  }

  const roleName = typeof user.role === "object" ? (user.role as { roleName: string }).roleName : user.role ?? "—";
  const roleObj = typeof user.role === "object" ? user.role as { roleName: string; isSystemRole?: boolean } : null;

  // ── Stat Cards ───────────────────────────────────────────────────────────────
  const statCards = [
    {
      title: "Total Leads",
      value: stats?.total ?? 0,
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Assigned",
      value: stats?.assigned ?? 0,
      icon: Users,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
    {
      title: "Follow Up",
      value: stats?.followup ?? 0,
      icon: Clock,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
    {
      title: "Closed",
      value: stats?.closed ?? 0,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      title: "Rejected",
      value: stats?.rejected ?? 0,
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  // ── Completion rate ──────────────────────────────────────────────────────────
  const completionRate =
    stats && stats.total > 0
      ? Math.round(((stats.closed) / stats.total) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Back */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
        <Button
          variant="ghost" size="sm"
          onClick={() => router.push("/users")}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </motion.div>

      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-border/50 overflow-hidden">
          {/* Gradient banner */}
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

          <CardContent className="relative pt-0 pb-6">
            {/* Avatar overlapping banner */}
            <div className="-mt-10 mb-4 flex items-end justify-between gap-4 flex-wrap">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarFallback className="bg-primary/15 text-primary text-2xl font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              {/* Status + role badges */}
              <div className="flex items-center gap-2 pb-1">
                <Badge
                  variant={user.status === "active" ? "success" : "secondary"}
                  className="capitalize"
                >
                  {user.status}
                </Badge>
                {roleObj?.isSystemRole && (
                  <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                    <Shield className="h-3 w-3" />
                    System
                  </Badge>
                )}
              </div>
            </div>

            {/* User details */}
            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                {user.designation && (
                  <p className="text-sm text-muted-foreground mt-0.5">{user.designation}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <InfoChip icon={Mail} value={user.email} />
                <InfoChip icon={Shield} value={roleName} />
                <InfoChip icon={Calendar} value={`Joined ${formatDate(user.createdAt)}`} />
              </div>

              {/* Performance bar */}
              {!statsLoading && stats && stats.total > 0 && (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">Closure Rate</span>
                    <span className="text-xs font-semibold text-foreground">{completionRate}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
      >
        {statCards.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className={`border-border/50 hover:${stat.border} transition-colors`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`rounded-lg p-1.5 ${stat.bg}`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? <span className="animate-pulse">—</span> : stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Leads Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Assigned Leads
                {pagination && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {pagination.total}
                  </span>
                )}
              </CardTitle>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Search leads..."
                      className="pl-8 h-8 w-48 text-sm"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-8 px-3" onClick={handleSearch}>
                    Go
                  </Button>
                </div>

                {/* Status Filter */}
                <Select
                  value={statusFilter}
                  onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {leadsLoading ? (
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
                      <th className="px-6 py-3 text-left">Lead</th>
                      <th className="px-6 py-3 text-left hidden sm:table-cell">Phone</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left hidden md:table-cell">Source</th>
                      <th className="px-6 py-3 text-center hidden lg:table-cell">Notes</th>
                      <th className="px-6 py-3 text-left hidden lg:table-cell">Created</th>
                      <th className="px-6 py-3 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {leads.map((lead, i) => {
                      const noteCount = Array.isArray(lead.notes) ? lead.notes.length : 0;
                      return (
                        <motion.tr
                          key={lead._id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-muted/20 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-sm text-foreground">{lead.name}</p>
                              {lead.email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Mail className="h-3 w-3" />
                                  {lead.email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              {lead.phone ? (
                                <><Phone className="h-3 w-3" /> {lead.phone}</>
                              ) : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={lead.status} />
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="text-sm text-muted-foreground capitalize">
                              {lead.source ?? "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell text-center">
                            {noteCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <StickyNote className="h-3 w-3" />
                                {noteCount}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(lead.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link href={`/leads/${lead._id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 md:opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
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
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(pagination.page - 1) * pagination.limit + 1}–
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{pagination.total}</span> leads
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={!pagination.hasPrevPage || isFetching}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-1">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline" size="icon" className="h-8 w-8"
                    disabled={!pagination.hasNextPage || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
