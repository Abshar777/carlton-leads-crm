"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, Phone, Mail, Globe, User2, Calendar,
  RefreshCw, StickyNote, Send, Pencil, Trash2, CheckCheck,
  X, ChevronDown, Activity, Clock, UserCheck, FilePlus2,
  MessageSquarePlus, PencilLine, Minus, UsersRound, ArrowRightLeft, BookOpen,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useLead, useUpdateLeadStatus, useAssignLead, useAddLeadNote, useUpdateLeadNote, useDeleteLeadNote, useUpdateLead, useAssignLeadToTeam, useTransferLeadToTeam } from "@/hooks/useLeads";
import { useAllCourses } from "@/hooks/useCourses";
import { useTeams } from "@/hooks/useTeams";
import { useAuthStore } from "@/lib/store/authStore";
import { formatDate, getInitials } from "@/lib/utils";
import type { LeadStatus, LeadNote, ActivityLog, ActivityAction } from "@/types/lead";
import type { Course } from "@/types/course";
import type { User } from "@/types";
import type { Team } from "@/types/team";
import LeadDialog from "@/components/leads/LeadDialog";

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

const ACTION_CONFIG: Record<ActivityAction, { icon: React.ElementType; color: string; bg: string }> = {
  lead_created: { icon: FilePlus2, color: "text-blue-400", bg: "bg-blue-500/15" },
  lead_updated: { icon: PencilLine, color: "text-purple-400", bg: "bg-purple-500/15" },
  status_changed: { icon: RefreshCw, color: "text-orange-400", bg: "bg-orange-500/15" },
  team_assigned: { icon: UsersRound, color: "text-indigo-400", bg: "bg-indigo-500/15" },
  lead_assigned: { icon: UserCheck, color: "text-yellow-400", bg: "bg-yellow-500/15" },
  note_added: { icon: MessageSquarePlus, color: "text-green-400", bg: "bg-green-500/15" },
  note_updated: { icon: PencilLine, color: "text-cyan-400", bg: "bg-cyan-500/15" },
  note_deleted: { icon: Minus, color: "text-red-400", bg: "bg-red-500/15" },
};

const noteSchema = z.object({ content: z.string().min(1, "Note cannot be empty").max(2000) });
type NoteForm = z.infer<typeof noteSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted/50 p-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
    </div>
  );
}

function getUserName(user: User | string | null | undefined): string {
  if (!user) return "—";
  if (typeof user === "string") return user;
  return user.name;
}

function getUserInitials(user: User | string | null | undefined): string {
  const name = getUserName(user);
  return getInitials(name === "—" ? "U" : name);
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────

function NotesPanel({
  leadId,
  notes,
  currentUserId,
  canEdit,
}: {
  leadId: string;
  notes: LeadNote[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addNote = useAddLeadNote();
  const updateNote = useUpdateLeadNote();
  const deleteNote = useDeleteLeadNote();

  const addForm = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });
  const editForm = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });

  function startEdit(note: LeadNote) {
    setEditingId(note._id);
    editForm.setValue("content", note.content);
  }

  function handleAdd(data: NoteForm) {
    addNote.mutate({ leadId, content: data.content }, {
      onSuccess: () => addForm.reset(),
    });
  }

  function handleUpdate(data: NoteForm) {
    if (!editingId) return;
    updateNote.mutate({ leadId, noteId: editingId, content: data.content }, {
      onSuccess: () => setEditingId(null),
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteNote.mutate({ leadId, noteId: deleteId }, {
      onSuccess: () => setDeleteId(null),
    });
  }

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  });

  const sorted = [...notes].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>This note will be permanently deleted. Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Notes
            {notes.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {notes.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new note */}
          {canEdit && (
            <form onSubmit={addForm.handleSubmit(handleAdd)} className="space-y-2">
              <Textarea
                {...addForm.register("content")}
                placeholder="Write a note..."
                className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus:border-primary/50 text-sm"
              />
              {addForm.formState.errors.content && (
                <p className="text-xs text-destructive">{addForm.formState.errors.content.message}</p>
              )}
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={addNote.isPending} className="gap-1.5">
                  {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Add Note
                </Button>
              </div>
            </form>
          )}

          {/* Notes list */}
          <AnimatePresence initial={false}>
            {sorted.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-8 text-center"
              >
                <StickyNote className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {sorted.map((note) => {
                  const isAuthor = typeof note.author === "object"
                    ? (note.author as User)._id === currentUserId
                    : note.author === currentUserId;
                  const authorName = getUserName(note.author as User | string);

                  return (
                    <motion.div
                      key={note._id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="group rounded-lg border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 transition-colors"
                    >
                      {editingId === note._id ? (
                        <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-2">
                          <Textarea
                            {...editForm.register("content")}
                            className="min-h-[70px] resize-none bg-background border-border text-sm"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="submit" size="sm" disabled={updateNote.isPending}>
                              {updateNote.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <CheckCheck className="h-3.5 w-3.5" />}
                              Save
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getUserInitials(note.author as User | string)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-foreground truncate">{authorName}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                · {formatDate(note.createdAt)}
                                {note.updatedAt !== note.createdAt && " (edited)"}
                              </span>
                            </div>
                            {(isAuthor || canEdit) && (
                              <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {isAuthor && (
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => startEdit(note)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteId(note._id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

function ActivityTimeline({ logs }: { logs: ActivityLog[] }) {
  const sorted = [...logs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Activity Log
          {logs.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {logs.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border/50" />

            {sorted.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] ?? {
                icon: Activity, color: "text-muted-foreground", bg: "bg-muted",
              };
              const Icon = cfg.icon;
              const by = getUserName(log.performedBy as User | string);

              return (
                <motion.div
                  key={log._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-4 pb-5 last:pb-0"
                >
                  {/* Icon bubble */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1.5">
                    <p className="text-sm text-foreground/90 leading-snug">{log.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs text-muted-foreground">by <span className="font-medium text-foreground/80">{by}</span></span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(log.createdAt)}</span>
                    </div>

                    {/* Changes detail */}
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(log.changes).map(([field, change]) => (
                          <div key={field} className="flex items-center gap-1.5 text-xs">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground capitalize">{field}</span>
                            <span className="text-muted-foreground/60 line-through">{String(change.from || "—")}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-foreground/80 font-medium">{String(change.to || "—")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const { user: authUser, hasPermission } = useAuthStore();

  const [editOpen, setEditOpen] = useState(false);

  const { data: lead, isLoading } = useLead(leadId);
  const { data: teamsData } = useTeams({ status: "active", limit: 100 });
  const { data: allCourses = [] } = useAllCourses();
  const teams = teamsData?.data ?? [];

  const updateStatus = useUpdateLeadStatus();
  const updateLead = useUpdateLead();
  const assignLead = useAssignLead();
  const assignToTeam = useAssignLeadToTeam();
  const transferToTeam = useTransferLeadToTeam();

  const canEdit = hasPermission("leads", "edit");
  const currentUserId = authUser?._id ?? "";

  // ── Access control helpers (computed after lead loads) ────────────────────
  // Super admin: system role named "Super Admin"
  const isSuperAdmin =
    authUser?.role?.isSystemRole === true &&
    authUser?.role?.roleName === "Super Admin";

  // Team leader: current user appears in lead's team.leaders array
  const teamObj = typeof lead?.team === "object" && lead?.team !== null
    ? (lead.team as Team)
    : null;

  const isTeamLeader = !!teamObj?.leaders?.some(
    (l) => (typeof l === "object" ? l._id : l) === currentUserId,
  );

  // Can assign/transfer: must be super admin OR team leader of this lead's team
  const canAssignOrTransfer = isSuperAdmin || isTeamLeader;

  // Team members available for assignment (only this team's members)
  const teamMembers: User[] = teamObj?.members
    ? (teamObj.members as User[]).filter((m) => typeof m === "object")
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" onClick={() => router.push("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Leads
        </Button>
      </div>
    );
  }

  const assignedUser = typeof lead.assignedTo === "object" ? lead.assignedTo as User : null;
  const reporterUser = typeof lead.reporter === "object" ? lead.reporter as User : null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <Button variant="ghost" size="sm" onClick={() => router.push("/leads")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Button>
        {canEdit && (
          <Button onClick={() => setEditOpen(true)} size="sm" variant="outline" className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit Lead
          </Button>
        )}
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — Lead info */}
        <div className="space-y-6 lg:col-span-1">

          {/* Lead Info Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0">
                      {getInitials(lead.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-foreground truncate">{lead.name}</h2>
                      {lead.source && (
                        <p className="text-xs text-muted-foreground capitalize">{lead.source}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Phone} label="Phone" value={lead.phone} />
                <InfoRow icon={Globe} label="Source" value={lead.source} />

                {/* Assigned To */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted/50 p-1.5">
                    <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                    {assignedUser ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-yellow-500/15 text-yellow-400 text-xs">
                            {getInitials(assignedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{assignedUser.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Reporter */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted/50 p-1.5">
                    <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Reporter</p>
                    <p className="text-sm font-medium">{getUserName(reporterUser)}</p>
                  </div>
                </div>

                {/* Team */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted/50 p-1.5">
                    <UsersRound className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Team</p>
                    {teamObj ? (
                      <p className="text-sm font-medium">{teamObj.name}</p>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No team</span>
                    )}
                  </div>
                </div>

                {/* Course */}
                {lead.course && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted/50 p-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Course</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {typeof lead.course === "object"
                            ? (lead.course as Course).name
                            : lead.course}
                        </p>
                        {typeof lead.course === "object" && (lead.course as Course).amount != null && (
                          <span className="text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                            ₹{(lead.course as Course).amount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <InfoRow icon={Calendar} label="Created" value={formatDate(lead.createdAt)} />
                <InfoRow icon={Clock} label="Last Updated" value={formatDate(lead.updatedAt)} />

                {/* Quick Actions */}
                {canEdit && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    {/* Status change — any editor can change status */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Change Status</p>
                      <Select
                        value={lead.status}
                        onValueChange={(val) =>
                          updateStatus.mutate({ id: lead._id, status: val as LeadStatus })
                        }
                        disabled={updateStatus.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {STATUS_CONFIG[s].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Course change */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Change Course
                      </p>
                      <Select
                        value={
                          lead.course
                            ? typeof lead.course === "object"
                              ? (lead.course as Course)._id
                              : (lead.course as string)
                            : "__none__"
                        }
                        onValueChange={(val) =>
                          updateLead.mutate({
                            id: lead._id,
                            data: { course: val === "__none__" ? null : val },
                          })
                        }
                        disabled={updateLead.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          {updateLead.isPending
                            ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
                            : <SelectValue placeholder="No course" />
                          }
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">
                            — No course —
                          </SelectItem>
                          {allCourses.map((c) => (
                            <SelectItem key={c._id} value={c._id} className="text-xs">
                              <span className="flex items-center justify-between gap-3 w-full">
                                <span>{c.name}</span>
                                <span className="text-muted-foreground">
                                  ₹{c.amount.toLocaleString("en-IN")}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assign to team member — only team leaders / super admin, only if lead has a team */}
                    {canAssignOrTransfer && teamObj && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Assign To Member</p>
                        {teamMembers.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No members in this team</p>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline" size="sm"
                                className="w-full justify-between h-8 text-xs"
                                disabled={assignLead.isPending}
                              >
                                {assignedUser ? assignedUser.name : "Select member"}
                                <ChevronDown className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                              {teamMembers.map((u) => (
                                <DropdownMenuItem
                                  key={u._id}
                                  onClick={() => assignLead.mutate({ id: lead._id, userId: u._id })}
                                  className="gap-2"
                                >
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-xs bg-muted">{getInitials(u.name)}</AvatarFallback>
                                  </Avatar>
                                  {u.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )}

                    {/* Assign / Transfer Team — only team leaders / super admin */}
                    {canAssignOrTransfer && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          {teamObj ? "Transfer to Team" : "Assign to Team"}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline" size="sm"
                              className="w-full justify-between h-8 text-xs"
                              disabled={assignToTeam.isPending || transferToTeam.isPending}
                            >
                              <span className="flex items-center gap-1.5">
                                {teamObj
                                  ? <ArrowRightLeft className="h-3 w-3" />
                                  : <UsersRound className="h-3 w-3" />}
                                {teamObj ? `Change from ${teamObj.name}` : "Select team"}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                            {teams.filter((t) => t._id !== teamObj?._id).map((t) => (
                              <DropdownMenuItem
                                key={t._id}
                                onClick={() =>
                                  teamObj
                                    ? transferToTeam.mutate({ id: lead._id, teamId: t._id })
                                    : assignToTeam.mutate({ id: lead._id, teamId: t._id })
                                }
                                className="gap-2"
                              >
                                <UsersRound className="h-4 w-4 text-muted-foreground" />
                                {t.name}
                              </DropdownMenuItem>
                            ))}
                            {teams.filter((t) => t._id !== teamObj?._id).length === 0 && (
                              <p className="px-3 py-2 text-xs text-muted-foreground">No other teams available</p>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity Timeline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <ActivityTimeline logs={lead.activityLogs ?? []} />
          </motion.div>
        </div>

        {/* Right column — Notes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <NotesPanel
            leadId={lead._id}
            notes={lead.notes ?? []}
            currentUserId={currentUserId}
            canEdit={canEdit}
          />
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <LeadDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        mode="edit"
      />
    </div>
  );
}
