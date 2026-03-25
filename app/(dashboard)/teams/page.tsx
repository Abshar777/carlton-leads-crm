"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Loader2, Edit2, Trash2, ExternalLink,
  UsersRound, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTeams } from "@/hooks/useTeams";
import { TeamDialog } from "@/components/teams/TeamDialog";
import { DeleteTeamDialog } from "@/components/teams/DeleteTeamDialog";
import { useAuthStore } from "@/lib/store/authStore";
import type { Team } from "@/types/team";

export default function TeamsPage() {
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission("leads", "create");
  const canEdit   = hasPermission("leads", "edit");
  const canDelete = hasPermission("leads", "delete");

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("all");
  const [page, setPage]               = useState(1);
  const [teamDialog, setTeamDialog]   = useState<{ open: boolean; team: Team | null }>({ open: false, team: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; team: Team | null }>({ open: false, team: null });

  const { data, isLoading } = useTeams({
    search:  search || undefined,
    status:  statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 12,
  });

  const teams      = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage teams, leaders, and members
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setTeamDialog({ open: true, team: null })}
            className="gap-2 w-full sm:w-auto shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Team
          </Button>
        )}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search teams..."
            className="pl-9 pr-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter — shadcn Select, not native <select> */}
        <Select value={statusFilter} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20 gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <UsersRound className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">No teams found</p>
          <p className="text-sm text-muted-foreground max-w-xs px-4">
            {search || statusFilter !== "all"
              ? "Try adjusting your filters."
              : "Create your first team to start organising leads."}
          </p>
          {canCreate && !search && statusFilter === "all" && (
            <Button
              onClick={() => setTeamDialog({ open: true, team: null })}
              className="mt-2 gap-2"
            >
              <Plus className="h-4 w-4" />
              New Team
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        >
          <AnimatePresence>
            {teams.map((team) => (
              <motion.div
                key={team._id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
                layout
              >
                <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <UsersRound className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{team.name}</CardTitle>
                          {team.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {team.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={team.status === "active" ? "default" : "secondary"}
                        className="shrink-0 capitalize"
                      >
                        {team.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-lg font-bold">{team.leaders?.length ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Leaders</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-lg font-bold">{team.members?.length ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Members</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-lg font-bold">{team.leadStats?.total ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Leads</p>
                        </div>
                      </div>

                      {team.leadStats && team.leadStats.unassigned > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          {team.leadStats.unassigned} unassigned lead
                          {team.leadStats.unassigned > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/teams/${team._id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Link>
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setTeamDialog({ open: true, team })}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialog({ open: true, team })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Page{" "}
            <span className="font-medium text-foreground">{pagination.page}</span> of{" "}
            <span className="font-medium text-foreground">{pagination.totalPages}</span>{" "}
            <span className="hidden sm:inline">({pagination.total} teams)</span>
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!pagination.hasPrevPage}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <span className="text-sm font-medium px-1 tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}
      <TeamDialog
        open={teamDialog.open}
        onOpenChange={(open) => setTeamDialog((d) => ({ ...d, open }))}
        team={teamDialog.team}
      />
      <DeleteTeamDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((d) => ({ ...d, open }))}
        team={deleteDialog.team}
      />
    </div>
  );
}
