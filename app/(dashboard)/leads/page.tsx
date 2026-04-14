"use client";
import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight,
  X, Upload, UserCheck, FileText, ChevronDown, ExternalLink,
  CalendarDays, Filter, CheckSquare, Square, Tags, ArrowRightLeft, AlertTriangle,
  LayoutGrid, List,
} from "lucide-react";
import Link from "next/link";
import { TodayLeadsButton } from "@/components/leads/LeadsDateFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadDialog } from "@/components/leads/LeadDialog";
import { DeleteLeadDialog } from "@/components/leads/DeleteLeadDialog";
import { AssignLeadDialog } from "@/components/leads/AssignLeadDialog";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { useLeads, useUpdateLeadStatus, useBulkUpdateLeadStatus, useBulkDeleteLeads, useBulkAssignLeadsToTeam } from "@/hooks/useLeads";
import { useAllCourses } from "@/hooks/useCourses";
import { useUsers } from "@/hooks/useUsers";
import { useTeams } from "@/hooks/useTeams";
import { useAuthStore } from "@/lib/store/authStore";
import { formatDate } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lead, LeadStatus } from "@/types/lead";
import type { User } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all",           label: "All Status"      },
  { value: "new",           label: "New"             },
  { value: "assigned",      label: "Assigned"        },
  { value: "followup",      label: "Follow Up"       },
  { value: "interested",    label: "Interested"      },
  { value: "cnc",           label: "CNC"             },
  { value: "booking",       label: "Booking"         },
  { value: "partialbooking",label: "Partial Booking" },
  { value: "closed",        label: "Closed"          },
  { value: "rejected",      label: "Rejected"        },
  { value: "rnr",           label: "RNR"             },
  { value: "callback",      label: "Call Back"       },
  { value: "whatsapp",      label: "WhatsApp"        },
  { value: "student",       label: "Student"         },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:            "bg-blue-500/15 text-blue-400 border-blue-500/30",
  assigned:       "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  followup:       "bg-orange-500/15 text-orange-400 border-orange-500/30",
  closed:         "bg-green-500/15 text-green-400 border-green-500/30",
  rejected:       "bg-red-500/15 text-red-400 border-red-500/30",
  cnc:            "bg-slate-500/15 text-slate-400 border-slate-500/30",
  booking:        "bg-teal-500/15 text-teal-400 border-teal-500/30",
  partialbooking: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  interested:     "bg-violet-500/15 text-violet-400 border-violet-500/30",
  rnr:            "bg-amber-500/15 text-amber-400 border-amber-500/30",
  callback:       "bg-sky-500/15 text-sky-400 border-sky-500/30",
  whatsapp:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  student:        "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:            "New",
  assigned:       "Assigned",
  followup:       "Follow Up",
  closed:         "Closed",
  rejected:       "Rejected",
  cnc:            "CNC",
  booking:        "Booking",
  partialbooking: "Partial Booking",
  interested:     "Interested",
  rnr:            "RNR",
  callback:       "Call Back",
  whatsapp:       "WhatsApp",
  student:        "Student",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function getUserName(user: User | string | null | undefined): string {
  if (!user) return "Unassigned";
  if (typeof user === "object") return user.name;
  return user;
}

function getUserId(user: User | string | null | undefined): string {
  if (!user) return "";
  if (typeof user === "object") return user._id;
  return user;
}

// ─── Active filter pill ───────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:text-primary/60 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LeadsPageContent() {
  const { hasPermission, user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>("all");
  const [assignedTo, setAssignedTo] = useState<string>("all");
  const [reporter, setReporter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("all");
  const [teamId, setTeamId] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // ── View mode — synced to ?view= URL param ────────────────────────────────────
  const [viewMode, setViewMode] = useState<"table" | "kanban">(() => {
    const v = searchParams.get("view");
    return v === "kanban" ? "kanban" : "table";
  });

  function changeViewMode(mode: "table" | "kanban") {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // ── Dialog state ─────────────────────────────────────────────────────────────
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // ── Bulk selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkTeamOpen, setBulkTeamOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>("followup");
  const [bulkTeamId, setBulkTeamId] = useState<string>("");

  const bulkUpdateStatus = useBulkUpdateLeadStatus();
  const bulkDeleteLeads = useBulkDeleteLeads();
  const bulkAssignTeam = useBulkAssignLeadsToTeam();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate: updateStatus } = useUpdateLeadStatus();

  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, debouncedSearch, status, assignedTo, reporter, dateFrom, dateTo, courseId, teamId]);

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const allPageIds = useMemo(() => [], []); // filled after leads load
  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }, []);

  // Debounce search → sends to backend
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Reset page when any filter changes
  function applyFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  const isTodayActive = dateFrom === todayISO() && dateTo === todayISO();
  function applyToday() {
    const today = todayISO();
    if (isTodayActive) { setDateFrom(""); setDateTo(""); }
    else { setDateFrom(today); setDateTo(today); }
    setPage(1);
  }

  const filters = useMemo(() => ({
    page,
    limit,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(assignedTo !== "all" ? { assignedTo } : {}),
    ...(reporter !== "all" ? { reporter } : {}),
    ...(courseId !== "all" ? { course: courseId } : {}),
    ...(teamId !== "all" ? { team: teamId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }), [page, limit, debouncedSearch, status, assignedTo, reporter, courseId, teamId, dateFrom, dateTo]);

  const { data, isLoading, isFetching } = useLeads(filters);
  const { data: usersData } = useUsers({ status: "active", limit: "200" });
  const { data: teamsData } = useTeams({ status: "active", limit: 100 });
  const { data: allCourses = [] } = useAllCourses();

  const leads = data?.data ?? [];
  const pagination = data?.pagination;
  const allUsers = usersData?.data ?? [];

  // ── Permissions & role detection ──────────────────────────────────────────────
  const canCreate = hasPermission("leads", "create");
  const canEdit = hasPermission("leads", "edit");
  const canDelete = hasPermission("leads", "delete");
  const isSuperAdmin =
    user?.role?.isSystemRole === true && user?.role?.roleName === "Super Admin";

  // Detect if current user is a leader of any team (by checking team data)
  const myLeaderTeam = teamsData?.data?.find((t) =>
    t.leaders?.some((l) => (typeof l === "object" ? l._id : l) === user?._id),
  ) ?? null;

  const isTeamLeader = !!myLeaderTeam;
  // "Admin-level" = can see people-based filters
  const isAdmin = isSuperAdmin || isTeamLeader;

  // For Assigned To filter: super admin sees all users; team leader sees their team members; else empty
  const filterableUsers = isSuperAdmin
    ? allUsers
    : isTeamLeader && myLeaderTeam
      ? (myLeaderTeam.members ?? []).filter((m): m is typeof allUsers[0] => typeof m === "object")
      : [];

  // Reporter filter only makes sense for super admin
  const showReporterFilter = isSuperAdmin;

  // ── Active filter detection ───────────────────────────────────────────────────
  const activeFilterCount = [
    status !== "all",
    assignedTo !== "all",
    reporter !== "all",
    courseId !== "all",
    teamId !== "all",
    !!dateFrom,
    !!dateTo,
    !!debouncedSearch,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  function clearAllFilters() {
    setStatus("all");
    setAssignedTo("all");
    setReporter("all");
    setCourseId("all");
    setTeamId("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreate = () => { setSelectedLead(null); setDialogOpen(true); };
  const handleEdit = (l: Lead) => { setSelectedLead(l); setDialogOpen(true); };
  const handleDelete = (l: Lead) => { setSelectedLead(l); setDeleteOpen(true); };
  const handleAssign = (l: Lead) => { setSelectedLead(l); setAssignOpen(true); };
  const handleStatusChange = (l: Lead, s: LeadStatus) => updateStatus({ id: l._id, status: s });

  // ── Active filter label helpers ───────────────────────────────────────────────
  function userName(id: string) {
    return allUsers.find((u) => u._id === id)?.name ?? id;
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Leads Management</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track and manage all your sales leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => router.push("/leads/upload")} className="gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload Leads</span>
              </Button>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Lead</span>
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Filters + Table ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-3 space-y-3">

            {/* Row 1 — Search + toggle filter button */}
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
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Right side — Today + filter toggle + view toggle + clear */}
              <div className="flex items-center gap-2 flex-wrap">
                <TodayLeadsButton active={isTodayActive} onClick={applyToday} />
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

                {/* View mode toggle */}
                <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 gap-0.5">
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => changeViewMode("table")}
                    title="Table view"
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                      viewMode === "table"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => changeViewMode("kanban")}
                    title="Kanban view"
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                      viewMode === "kanban"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </motion.button>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                    Clear all
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
                  <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">

                    {/* Status */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      <Select value={status} onValueChange={(v) => applyFilter(setStatus, v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assigned To — only visible to admins/team leaders */}
                    {isAdmin && filterableUsers.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
                        <Select value={assignedTo} onValueChange={(v) => applyFilter(setAssignedTo, v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="All Members" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">All Members</SelectItem>
                            {filterableUsers.map((u) => (
                              <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Reporter — only visible to super admins */}
                    {showReporterFilter && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Reporter</p>
                        <Select value={reporter} onValueChange={(v) => applyFilter(setReporter, v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="All Reporters" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">All Reporters</SelectItem>
                            {allUsers.map((u) => (
                              <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Course */}
                    {allCourses.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Course</p>
                        <Select value={courseId} onValueChange={(v) => applyFilter(setCourseId, v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="All Courses" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">All Courses</SelectItem>
                            {allCourses.map((c) => (
                              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Team — only visible to super admins */}
                    {isSuperAdmin && (teamsData?.data?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Team</p>
                        <Select value={teamId} onValueChange={(v) => applyFilter(setTeamId, v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="All Teams" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">All Teams</SelectItem>
                            {(teamsData?.data ?? []).map((t) => (
                              <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Date Range */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Date Range (Created)
                      </p>
                      {/* Quick period buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {(["today", "week", "month", "year"] as const).map((p) => {
                          const labels = { today: "Today", week: "This Week", month: "This Month", year: "This Year" };
                          const getRangeFor = (period: string) => {
                            const now = new Date(); const t = now.toISOString().slice(0,10);
                            if (period === "today") return { f: t, t };
                            if (period === "week") { const m = new Date(now); m.setDate(now.getDate()-((now.getDay()+6)%7)); return { f: m.toISOString().slice(0,10), t }; }
                            if (period === "month") return { f: new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10), t };
                            return { f: new Date(now.getFullYear(),0,1).toISOString().slice(0,10), t };
                          };
                          const range = getRangeFor(p);
                          const isActive = dateFrom === range.f && dateTo === range.t;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => { if (isActive) { setDateFrom(""); setDateTo(""); } else { setDateFrom(range.f); setDateTo(range.t); } setPage(1); }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}
                            >
                              {labels[p]}
                            </button>
                          );
                        })}
                      </div>
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
                  <FilterPill label={`Search: "${debouncedSearch}"`} onRemove={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }} />
                )}
                {status !== "all" && (
                  <FilterPill label={`Status: ${STATUS_LABELS[status as LeadStatus]}`} onRemove={() => applyFilter(setStatus, "all")} />
                )}
                {assignedTo !== "all" && (
                  <FilterPill label={`Assigned: ${userName(assignedTo)}`} onRemove={() => applyFilter(setAssignedTo, "all")} />
                )}
                {reporter !== "all" && (
                  <FilterPill label={`Reporter: ${userName(reporter)}`} onRemove={() => applyFilter(setReporter, "all")} />
                )}
                {courseId !== "all" && (
                  <FilterPill
                    label={`Course: ${allCourses.find((c) => c._id === courseId)?.name ?? courseId}`}
                    onRemove={() => applyFilter(setCourseId, "all")}
                  />
                )}
                {teamId !== "all" && (
                  <FilterPill
                    label={`Team: ${teamsData?.data?.find((t) => t._id === teamId)?.name ?? teamId}`}
                    onRemove={() => applyFilter(setTeamId, "all")}
                  />
                )}
                {dateFrom && (
                  <FilterPill label={`From: ${dateFrom}`} onRemove={() => { setDateFrom(""); setPage(1); }} />
                )}
                {dateTo && (
                  <FilterPill label={`To: ${dateTo}`} onRemove={() => { setDateTo(""); setPage(1); }} />
                )}
              </motion.div>
            )}
          </CardHeader>

          {/* ── Kanban Board ───────────────────────────────────────────────────── */}
          {viewMode === "kanban" && (
            <CardContent className="px-3 sm:px-4 pt-4 pb-3 overflow-hidden">
              <KanbanBoard
                filters={{
                  ...(debouncedSearch ? { search: debouncedSearch } : {}),
                  ...(status !== "all" ? { status } : {}),
                  ...(assignedTo !== "all" ? { assignedTo } : {}),
                  ...(reporter !== "all" ? { reporter } : {}),
                  ...(courseId !== "all" ? { course: courseId } : {}),
                  ...(teamId !== "all" ? { team: teamId } : {}),
                  ...(dateFrom ? { dateFrom } : {}),
                  ...(dateTo ? { dateTo } : {}),
                }}
                canEdit={canEdit}
              />
            </CardContent>
          )}

          {/* ── Table ──────────────────────────────────────────────────────────── */}
          {viewMode === "table" && (
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <div className="py-20 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No leads found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {hasActiveFilters ? "Try adjusting your filters" : "Create your first lead to get started"}
                </p>
                {canCreate && !hasActiveFilters && (
                  <Button variant="outline" className="mt-4" onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-1" /> Create first lead
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* ── Mobile card list (< sm) ─────────────────────────────────── */}
                <div className="sm:hidden divide-y divide-border">
                  {/* Select-all row */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/20">
                    <Checkbox
                      checked={leads.length > 0 && leads.every((l) => selectedIds.has(l._id))}
                      onCheckedChange={() => toggleAll(leads.map((l) => l._id))}
                      aria-label="Select all"
                    />
                    <span className="text-xs text-muted-foreground font-medium">Select all on this page</span>
                  </div>
                  <AnimatePresence>
                    {leads.map((lead, i) => (
                      <motion.div
                        key={lead._id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className={`px-4 py-3 transition-colors ${selectedIds.has(lead._id) ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedIds.has(lead._id)}
                            onCheckedChange={() => toggleId(lead._id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Select lead"
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            {/* Name + status */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{lead.name}</p>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  disabled={getUserId(lead.assignedTo as User | string | null) !== user?._id && !isAdmin}
                                  asChild
                                >
                                  <button className="flex items-center gap-0.5 shrink-0">
                                    <StatusBadge status={lead.status} />
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                                    <DropdownMenuItem
                                      key={s}
                                      onClick={() => handleStatusChange(lead, s)}
                                      className={lead.status === s ? "font-semibold" : ""}
                                    >
                                      <StatusBadge status={s} />
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {/* Contact */}
                            {lead.email && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.email}</p>}
                            {lead.phone && <p className="text-xs text-muted-foreground/70">{lead.phone}</p>}
                            {/* Meta row */}
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                              {lead.team && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {typeof lead.team === "object" ? lead.team.name : lead.team}
                                </span>
                              )}
                              {lead.assignedTo && (
                                <span className="text-[11px] text-muted-foreground">
                                  {getUserName(lead.assignedTo as User | string | null)}
                                  {lead.assignedAt && (
                                    <span className="ml-1 text-muted-foreground/50">
                                      · {new Date(lead.assignedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </span>
                                  )}
                                </span>
                              )}
                              {lead.source && (
                                <span className="text-[11px] text-muted-foreground/60 capitalize">{lead.source}</span>
                              )}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Link href={`/leads/${lead._id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="View">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            {canEdit && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(lead)} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(lead)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* ── Desktop table (≥ sm) ────────────────────────────────────── */}
                <div className="hidden sm:block overflow-x-auto">
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
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Contact</th>
                        <th className="px-4 py-3 text-left hidden md:table-cell">Source</th>
                        <th className="px-4 py-3 text-left hidden xl:table-cell">Course</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left hidden lg:table-cell">Team</th>
                        <th className="px-4 py-3 text-left hidden lg:table-cell">Assigned To</th>
                        <th className="px-4 py-3 text-left hidden xl:table-cell">Assigned At</th>
                        <th className="px-4 py-3 text-left hidden xl:table-cell">Reporter</th>
                        <th className="px-4 py-3 text-left hidden xl:table-cell">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <AnimatePresence>
                        {leads.map((lead, i) => (
                          <motion.tr
                            key={lead._id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ delay: i * 0.025 }}
                            className={`group hover:bg-muted/20 transition-colors ${selectedIds.has(lead._id) ? "bg-primary/5" : ""}`}
                          >
                            <td className="pl-4 pr-2 py-4">
                              <Checkbox
                                checked={selectedIds.has(lead._id)}
                                onCheckedChange={() => toggleId(lead._id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Select lead"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-sm">{lead.name}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-0.5">
                                {lead.email && <p className="text-sm text-muted-foreground">{lead.email}</p>}
                                {lead.phone && <p className="text-xs text-muted-foreground/70">{lead.phone}</p>}
                                {!lead.email && !lead.phone && <span className="text-sm text-muted-foreground/50">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4 hidden md:table-cell">
                              <span className="text-sm text-muted-foreground capitalize">{lead.source ?? "—"}</span>
                            </td>
                            <td className="px-4 py-4 hidden xl:table-cell">
                              {lead.course ? (
                                <span className="text-sm text-muted-foreground">
                                  {typeof lead.course === "object" ? lead.course.name : lead.course}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  disabled={getUserId(lead.assignedTo as User | string | null) !== user?._id && !isAdmin}
                                  asChild
                                >
                                  <button className="flex items-center gap-1 group/status">
                                    <StatusBadge status={lead.status} />
                                    <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover/status:opacity-100 transition-opacity" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                                    <DropdownMenuItem
                                      key={s}
                                      onClick={() => handleStatusChange(lead, s)}
                                      className={lead.status === s ? "font-semibold" : ""}
                                    >
                                      <StatusBadge status={s} />
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                            <td className="px-4 py-4 hidden lg:table-cell">
                              {lead.team ? (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {typeof lead.team === "object" ? lead.team.name : lead.team}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 hidden lg:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {getUserName(lead.assignedTo as User | string | null)}
                              </span>
                            </td>
                            <td className="px-4 py-4 hidden xl:table-cell">
                              {lead.assignedAt ? (
                                <div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(lead.assignedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground/60">
                                    {new Date(lead.assignedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })} IST
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 hidden xl:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {getUserName(lead.reporter as User | string | null)}
                              </span>
                            </td>
                            <td className="px-4 py-4 hidden xl:table-cell">
                              <span className="text-sm text-muted-foreground">{formatDate(lead.createdAt)}</span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-1">
                                <Link href={`/leads/${lead._id}`}>
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 md:opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary"
                                    title="View Detail"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </Link>
                                {canEdit && (
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleEdit(lead)}
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 md:opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(lead)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── Pagination ──────────────────────────────────────────────────── */}
            {pagination && pagination.totalPages >= 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 sm:px-6 py-3 sm:py-4 gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {pagination.total === 0 ? "No leads" : (
                      <>
                        <span className="hidden sm:inline">Showing </span>
                        <span className="font-medium text-foreground">
                          {(pagination.page - 1) * pagination.limit + 1}–
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>
                        <span className="hidden sm:inline"> of </span>
                        <span className="sm:hidden"> / </span>
                        <span className="font-medium text-foreground">{pagination.total}</span>
                        <span className="hidden sm:inline"> leads</span>
                      </>
                    )}
                  </p>
                  <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-7 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-xs">{n} / page</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      disabled={!pagination.hasPrevPage || isFetching}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
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
                )}
              </div>
            )}
          </CardContent>
          )}
        </Card>
      </motion.div>

      {/* ── Dialogs ────────────────────────────────────────────────────────────── */}
      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={selectedLead} />
      <DeleteLeadDialog open={deleteOpen} onOpenChange={setDeleteOpen} lead={selectedLead} />
      <AssignLeadDialog open={assignOpen} onOpenChange={setAssignOpen} lead={selectedLead} />

      {/* ── Bulk: Change Status ───────────────────────────────────────────────── */}
      <ResponsiveDialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <ResponsiveDialogContent desktopClassName="max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              Change Status
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Updating status for{" "}
              <span className="font-semibold text-foreground">{selectedIds.size}</span> lead(s)
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="px-4 sm:px-0 py-2 space-y-3">
            <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as LeadStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={bulkUpdateStatus.isPending}
              onClick={() => {
                bulkUpdateStatus.mutate(
                  { leadIds: Array.from(selectedIds), status: bulkStatus },
                  { onSuccess: () => { setBulkStatusOpen(false); setSelectedIds(new Set()); } },
                );
              }}
            >
              {bulkUpdateStatus.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Apply
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ── Bulk: Assign to Team ──────────────────────────────────────────────── */}
      <ResponsiveDialog open={bulkTeamOpen} onOpenChange={setBulkTeamOpen}>
        <ResponsiveDialogContent desktopClassName="max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Assign to Team
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Assigning{" "}
              <span className="font-semibold text-foreground">{selectedIds.size}</span> lead(s) to a team.
              Current member assignment will be cleared.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="px-4 sm:px-0 py-2 space-y-3">
            <Select value={bulkTeamId} onValueChange={setBulkTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {(teamsData?.data ?? []).map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkTeamOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!bulkTeamId || bulkAssignTeam.isPending}
              onClick={() => {
                if (!bulkTeamId) return;
                bulkAssignTeam.mutate(
                  { leadIds: Array.from(selectedIds), teamId: bulkTeamId },
                  { onSuccess: () => { setBulkTeamOpen(false); setSelectedIds(new Set()); setBulkTeamId(""); } },
                );
              }}
            >
              {bulkAssignTeam.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Assign
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ── Bulk: Delete confirm ──────────────────────────────────────────────── */}
      <ResponsiveDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <ResponsiveDialogContent desktopClassName="max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Delete {selectedIds.size} Lead(s)?
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              This permanently deletes the selected leads and all their notes and activity logs.
              This action <span className="font-semibold text-foreground">cannot be undone</span>.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkDeleteLeads.isPending}
              onClick={() => {
                bulkDeleteLeads.mutate(Array.from(selectedIds), {
                  onSuccess: () => { setBulkDeleteOpen(false); setSelectedIds(new Set()); },
                });
              }}
            >
              {bulkDeleteLeads.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Delete
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ── Floating Bulk Action Bar ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-4 sm:bottom-6 left-1/4 sm:left-1/2 z-50 -translate-x-1/2  sm:w-auto max-w-lg"
          >
            <div className="flex items-center gap-1 sm:gap-2 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl px-3 sm:px-4 py-2.5 sm:py-3">
              <div className="flex items-center gap-1.5 pr-2.5 sm:pr-3 border-r border-border shrink-0">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
                  {selectedIds.size}
                  <span className="hidden sm:inline"> selected</span>
                </span>
              </div>

              {/* Change Status */}
              {canEdit && (
                <Button
                  variant="ghost" size="sm"
                  className="gap-1 h-8 text-xs px-2 sm:px-3 text-foreground hover:bg-muted"
                  onClick={() => setBulkStatusOpen(true)}
                >
                  <Tags className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Status</span>
                </Button>
              )}

              {/* Assign to Team */}
              {(isSuperAdmin || isTeamLeader) && (
                <Button
                  variant="ghost" size="sm"
                  className="gap-1 h-8 text-xs px-2 sm:px-3 text-foreground hover:bg-muted"
                  onClick={() => setBulkTeamOpen(true)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Assign Team</span>
                </Button>
              )}

              {/* Delete */}
              {canDelete && (
                <Button
                  variant="ghost" size="sm"
                  className="gap-1 h-8 text-xs px-2 sm:px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Delete</span>
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

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LeadsPageContent />
    </Suspense>
  );
}
