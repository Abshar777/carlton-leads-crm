"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Eye, Loader2, Phone, Mail, User2, ExternalLink,
  Calendar, Clock, BookOpen, Users, StickyNote, Bell, PhoneOff, X,
  Pencil, CreditCard, MoreHorizontal, AlarmClock, MessageSquarePlus,
  Plus, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  useLeads, useUpdateLeadStatus, useUpdateCallNotConnected,
  useAddLeadNote, useLead,
} from "@/hooks/useLeads";
import { useAddPayment } from "@/hooks/usePayments";
import { useAddReminder } from "@/hooks/useReminders";
import { getInitials, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, LeadFilters, LeadNote } from "@/types/lead";
import type { User } from "@/types";
import type { Course } from "@/types/course";
import type { Team } from "@/types/team";
import LeadDialog from "@/components/leads/LeadDialog";

// ─── Config ───────────────────────────────────────────────────────────────────

const KANBAN_STATUSES: LeadStatus[] = [
  "new", "assigned", "followup", "interested", "cnc",
  "booking", "notinterested", "closed", "invalid",
  "rnr", "callback", "whatsapp", "student",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:            "New",
  assigned:       "Assigned",
  followup:       "Follow Up",
  interested:     "Interested",
  cnc:            "CNC",
  booking:        "Booking",
  notinterested:  "Not Interested",
  closed:         "Closed",
  invalid:        "Invalid",
  rnr:            "RNR",
  callback:       "Call Back",
  whatsapp:       "WhatsApp",
  student:        "Student",
};

const STATUS_STYLE: Record<LeadStatus, {
  header: string; border: string; dot: string; dropZone: string; badge: string;
}> = {
  new:            { header: "bg-blue-500/15 text-blue-400",       border: "border-blue-500/25",    dot: "bg-blue-400",    dropZone: "border-blue-500/50 bg-blue-500/5",       badge: "bg-blue-500/15 text-blue-400 border-blue-500/30"       },
  assigned:       { header: "bg-yellow-500/15 text-yellow-400",   border: "border-yellow-500/25",  dot: "bg-yellow-400",  dropZone: "border-yellow-500/50 bg-yellow-500/5",   badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"   },
  followup:       { header: "bg-orange-500/15 text-orange-400",   border: "border-orange-500/25",  dot: "bg-orange-400",  dropZone: "border-orange-500/50 bg-orange-500/5",   badge: "bg-orange-500/15 text-orange-400 border-orange-500/30"   },
  interested:     { header: "bg-violet-500/15 text-violet-400",   border: "border-violet-500/25",  dot: "bg-violet-400",  dropZone: "border-violet-500/50 bg-violet-500/5",   badge: "bg-violet-500/15 text-violet-400 border-violet-500/30"   },
  cnc:            { header: "bg-slate-500/15 text-slate-400",     border: "border-slate-500/25",   dot: "bg-slate-400",   dropZone: "border-slate-500/50 bg-slate-500/5",    badge: "bg-slate-500/15 text-slate-400 border-slate-500/30"       },
  booking:        { header: "bg-teal-500/15 text-teal-400",       border: "border-teal-500/25",    dot: "bg-teal-400",    dropZone: "border-teal-500/50 bg-teal-500/5",       badge: "bg-teal-500/15 text-teal-400 border-teal-500/30"         },
  notinterested:  { header: "bg-orange-500/15 text-orange-400",   border: "border-orange-500/25",  dot: "bg-orange-400",  dropZone: "border-orange-500/50 bg-orange-500/5",   badge: "bg-orange-500/15 text-orange-400 border-orange-500/30"   },
  closed:         { header: "bg-green-500/15 text-green-400",     border: "border-green-500/25",   dot: "bg-green-400",   dropZone: "border-green-500/50 bg-green-500/5",    badge: "bg-green-500/15 text-green-400 border-green-500/30"       },
  invalid:        { header: "bg-red-500/15 text-red-400",         border: "border-red-500/25",     dot: "bg-red-400",     dropZone: "border-red-500/50 bg-red-500/5",        badge: "bg-red-500/15 text-red-400 border-red-500/30"             },
  rnr:            { header: "bg-amber-500/15 text-amber-400",     border: "border-amber-500/25",   dot: "bg-amber-400",   dropZone: "border-amber-500/50 bg-amber-500/5",    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30"       },
  callback:       { header: "bg-sky-500/15 text-sky-400",         border: "border-sky-500/25",     dot: "bg-sky-400",     dropZone: "border-sky-500/50 bg-sky-500/5",        badge: "bg-sky-500/15 text-sky-400 border-sky-500/30"           },
  whatsapp:       { header: "bg-emerald-500/15 text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-400", dropZone: "border-emerald-500/50 bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  student:        { header: "bg-indigo-500/15 text-indigo-400",   border: "border-indigo-500/25",  dot: "bg-indigo-400",  dropZone: "border-indigo-500/50 bg-indigo-500/5",   badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user: User | string | null | undefined): string {
  if (!user) return "";
  return typeof user === "object" ? user.name : user;
}

// ─── Mobile detection ────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ─── Quick Payment Dialog (responsive) ────────────────────────────────────────

function QuickPaymentDialog({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const addPayment = useAddPayment(lead._id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    addPayment.mutate(
      { amount: amt, note: note || undefined, paidAt: `${paidAt}T00:00:00+05:30` },
      { onSuccess: () => { onClose(); setAmount(""); setNote(""); } },
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onClose}>
      <ResponsiveDialogContent desktopClassName="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-teal-400" />
            Add Payment — {lead.name}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 sm:px-0 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Amount (₹) *</Label>
            <Input type="number" min="1" placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="h-9 [color-scheme:dark]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note (optional)</Label>
            <Textarea placeholder="Payment note…" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[60px] resize-none text-sm" />
          </div>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" className="flex-1" disabled={addPayment.isPending}>
              {addPayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save Payment
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// ─── Quick Reminder Dialog (responsive) ──────────────────────────────────────

function QuickReminderDialog({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const addReminder = useAddReminder(lead._id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!remindAt) return;
    addReminder.mutate(
      { title: title || undefined, note: note || undefined, remindAt: `${remindAt}:00+05:30` },
      { onSuccess: () => { onClose(); setTitle(""); setNote(""); setRemindAt(""); } },
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onClose}>
      <ResponsiveDialogContent desktopClassName="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
            <AlarmClock className="h-4 w-4 text-violet-400" />
            Add Reminder — {lead.name}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 px-4 sm:px-0 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Remind At *</Label>
            <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} className="h-9 [color-scheme:dark]" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title (optional)</Label>
            <Input placeholder="Call back, Follow up…" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note (optional)</Label>
            <Textarea placeholder="Reminder note…" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[60px] resize-none text-sm" />
          </div>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" className="flex-1" disabled={addReminder.isPending}>
              {addReminder.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Set Reminder
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// ─── Quick Notes Dialog (responsive) — add note + view existing ───────────────

function QuickNotesDialog({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const [content, setContent] = useState("");
  const { data: fullLead, isLoading } = useLead(open ? lead._id : "");
  const addNote = useAddLeadNote();

  const notes: LeadNote[] = (fullLead?.notes ?? []).slice().reverse();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    addNote.mutate(
      { leadId: lead._id, content: content.trim() },
      { onSuccess: () => setContent("") },
    );
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onClose}>
      <ResponsiveDialogContent desktopClassName="max-w-md" height="auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4 text-blue-400" />
            Notes — {lead.name}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="px-4 sm:px-0 space-y-4 pb-2">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              placeholder="Write a note…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[72px] resize-none text-sm"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={addNote.isPending || !content.trim()}>
                {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Add Note
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Previous Notes {notes.length > 0 && `(${notes.length})`}
            </p>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                <StickyNote className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
                <AnimatePresence initial={false}>
                  {notes.map((note) => {
                    const authorName = typeof note.author === "object"
                      ? (note.author as User).name
                      : "Unknown";
                    return (
                      <motion.div
                        key={note._id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1"
                      >
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-medium text-primary/80 bg-primary/10 rounded px-1.5 py-0.5">
                            {authorName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit", hour12: true,
                            })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// ─── Kanban Actions Menu — dropdown on desktop, bottom sheet on mobile ────────

interface KanbanActionsMenuProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onAddPayment: (lead: Lead) => void;
  onAddReminder: (lead: Lead) => void;
  onAddNote: (lead: Lead) => void;
  onCNC: (leadId: string) => void;
}

function KanbanActionsMenu({ lead, onEdit, onAddPayment, onAddReminder, onAddNote, onCNC }: KanbanActionsMenuProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const triggerBtn = (
    <button
      draggable={false}
      onClick={(e) => {
        e.stopPropagation();
        if (isMobile) setSheetOpen(true);
      }}
      className="flex h-6 w-6 items-center justify-center rounded-md
        text-muted-foreground hover:text-foreground hover:bg-muted transition-colors
        sm:opacity-0 sm:group-hover:opacity-100 opacity-100"
      title="Actions"
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
    </button>
  );

  if (isMobile) {
    const mobileActions = [
      { icon: Pencil,            label: "Edit Lead",    color: "text-foreground",    onClick: () => onEdit(lead)           },
      { icon: CreditCard,        label: "Add Payment",  color: "text-teal-400",      onClick: () => onAddPayment(lead)     },
      { icon: AlarmClock,        label: "Add Reminder", color: "text-violet-400",    onClick: () => onAddReminder(lead)    },
      { icon: MessageSquarePlus, label: "Notes",        color: "text-blue-400",      onClick: () => onAddNote(lead)        },
      { icon: PhoneOff,          label: "CNC +1",       color: "text-orange-400",    onClick: () => onCNC(lead._id)        },
    ];

    return (
      <>
        {triggerBtn}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            hideClose
            className="p-0 rounded-t-2xl max-h-[60dvh] overflow-hidden"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 py-2.5 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {getInitials(lead.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
                  <p className="text-[11px] text-muted-foreground">{lead.phone}</p>
                </div>
              </div>
            </div>
            <div className="px-2 py-2 pb-[max(env(safe-area-inset-bottom),12px)]">
              {mobileActions.map(({ icon: Icon, label, color, onClick }) => (
                <button
                  key={label}
                  onClick={() => { setSheetOpen(false); onClick(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5
                    text-left hover:bg-muted/60 active:bg-muted transition-colors"
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${color}`} style={{ width: 18, height: 18 }} />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerBtn}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onEdit(lead)} className="gap-2 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Edit Lead
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAddPayment(lead)} className="gap-2 text-xs">
          <CreditCard className="h-3.5 w-3.5 text-teal-400" /> Add Payment
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddReminder(lead)} className="gap-2 text-xs">
          <AlarmClock className="h-3.5 w-3.5 text-violet-400" /> Add Reminder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAddNote(lead)} className="gap-2 text-xs">
          <MessageSquarePlus className="h-3.5 w-3.5 text-blue-400" /> Notes
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onCNC(lead._id)} className="gap-2 text-xs">
          <PhoneOff className="h-3.5 w-3.5 text-orange-400" /> CNC +1
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Lead Preview Popup ───────────────────────────────────────────────────────

export interface LeadPreviewProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

function LeadPreviewBody({
  lead,
  onClose,
  onViewFull,
}: {
  lead: Lead;
  onClose: () => void;
  onViewFull: () => void;
}) {
  const style = STATUS_STYLE[lead.status];
  const teamObj    = typeof lead.team   === "object" ? lead.team   as Team   : null;
  const courseObj  = typeof lead.course === "object" ? lead.course as Course : null;
  const assignedName = getUserName(lead.assignedTo as User | string | null);

  function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
          <p className="text-sm font-medium text-foreground break-all">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative px-5 pt-5 pb-4 border-b border-border/50">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base">
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold leading-tight truncate">
                {lead.name}
              </DialogTitle>
              {lead.source && (
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{lead.source}</p>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${style.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {STATUS_LABELS[lead.status]}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3 overflow-y-auto max-h-[55vh]">
        <Row icon={Phone}    label="Phone"        value={lead.phone} />
        <Row icon={Mail}     label="Email"        value={lead.email} />
        <Row icon={User2}    label="Assigned To"  value={assignedName || "Unassigned"} />
        <Row icon={Users}    label="Team"         value={teamObj?.name} />
        <Row icon={BookOpen} label="Course"
          value={courseObj
            ? `${courseObj.name}${courseObj.amount != null ? ` · ₹${courseObj.amount.toLocaleString("en-IN")}` : ""}`
            : undefined}
        />
        <Row icon={Calendar} label="Created"      value={formatDate(lead.createdAt)} />
        <Row icon={Clock}    label="Last Updated" value={formatDate(lead.updatedAt)} />
        {lead.assignedAt && (
          <Row icon={Clock} label="Assigned At"
            value={new Date(lead.assignedAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
              year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
            }) + " IST"}
          />
        )}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { icon: StickyNote, label: "Notes",     value: lead.notes?.length ?? 0,    color: "text-blue-400"   },
            { icon: Bell,       label: "Reminders", value: lead.reminders?.length ?? 0, color: "text-violet-400" },
            { icon: PhoneOff,   label: "CNC",       value: lead.callNotConnected ?? 0,  color: "text-orange-400" },
            { icon: Phone,      label: "Calls",     value: lead.callCount ?? 0,         color: "text-sky-400"    },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-border/40 bg-muted/20 py-2.5">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-sm font-bold text-foreground">{value}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border/50 flex items-center gap-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
          Close
        </Button>
        <Button size="sm" className="flex-1 gap-2" onClick={onViewFull}>
          <ExternalLink className="h-3.5 w-3.5" />
          View Full Lead
        </Button>
      </div>
    </>
  );
}

export function LeadPreviewPopup({ lead, open, onClose }: LeadPreviewProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  if (!lead) return null;

  function handleViewFull() {
    onClose();
    router.push(`/leads/${lead!._id}`);
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          hideClose
          className="p-0 rounded-t-2xl max-h-[90dvh] overflow-hidden gap-0 flex flex-col"
        >
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <LeadPreviewBody lead={lead} onClose={onClose} onViewFull={handleViewFull} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full p-0 gap-0 overflow-hidden">
        <LeadPreviewBody lead={lead} onClose={onClose} onViewFull={handleViewFull} />
      </DialogContent>
    </Dialog>
  );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

interface KanbanCardProps {
  lead: Lead;
  isDragging: boolean;
  canEdit: boolean;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onPreview: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onAddPayment: (lead: Lead) => void;
  onAddReminder: (lead: Lead) => void;
  onAddNote: (lead: Lead) => void;
  onCNC: (leadId: string) => void;
  onCNCDecrement: (leadId: string) => void;
}

function KanbanCard({
  lead, isDragging, canEdit, onDragStart, onDragEnd,
  onPreview, onEdit, onAddPayment, onAddReminder, onAddNote, onCNC, onCNCDecrement,
}: KanbanCardProps) {
  const style = STATUS_STYLE[lead.status];
  const assignedName = getUserName(lead.assignedTo as User | string | null);
  const cncCount = lead.callNotConnected ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0, scale: isDragging ? 0.96 : 1 }}
      exit={{ opacity: 0, scale: 0.93, transition: { duration: 0.12 } }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, lead._id)}
      onDragEnd={onDragEnd}
      className={`group relative rounded-xl border bg-card shadow-sm cursor-grab active:cursor-grabbing
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 select-none overflow-hidden
        ${style.border}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${style.dot}`} />

      <div className="p-3 pl-4">
        {/* Top row — avatar + name + actions */}
        <div className="flex items-start gap-2 mb-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold mt-0.5">
            {getInitials(lead.name)}
          </div>
          <p className="flex-1 text-sm font-semibold text-foreground leading-tight break-words min-w-0">
            {lead.name}
          </p>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              draggable={false}
              onClick={(e) => { e.stopPropagation(); onPreview(lead); }}
              className="flex h-6 w-6 items-center justify-center rounded-md
                text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors
                sm:opacity-0 sm:group-hover:opacity-100 opacity-100"
              title="Quick view"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {canEdit && (
              <KanbanActionsMenu
                lead={lead}
                onEdit={onEdit}
                onAddPayment={onAddPayment}
                onAddReminder={onAddReminder}
                onAddNote={onAddNote}
                onCNC={onCNC}
              />
            )}
          </div>
        </div>

        {/* Phone */}
        {lead.phone && (
          <div className="flex items-center gap-1.5 mb-2">
            <Phone className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="text-[11px] font-mono text-muted-foreground">{lead.phone}</span>
          </div>
        )}

        {/* Bottom row — assigned + CNC */}
        <div className="flex items-center justify-between gap-2 mt-1">
          {assignedName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground shrink-0">
                {getInitials(assignedName)}
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{assignedName}</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/40">Unassigned</span>
          )}

          {/* CNC display — inline +/- when status is cnc */}
          {lead.status === "cnc" ? (
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                draggable={false}
                onClick={(e) => { e.stopPropagation(); if (cncCount > 0) onCNCDecrement(lead._id); }}
                disabled={cncCount === 0}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="CNC -1"
              >
                <Minus className="h-3 w-3" />
              </button>
              <div className="flex items-center gap-0.5 px-1">
                <PhoneOff className="h-3 w-3 text-orange-400" />
                <span className="text-[11px] font-bold text-orange-400 tabular-nums min-w-[14px] text-center">{cncCount}</span>
              </div>
              <button
                draggable={false}
                onClick={(e) => { e.stopPropagation(); onCNC(lead._id); }}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                title="CNC +1"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {cncCount > 0 && (
                <div className="flex items-center gap-0.5">
                  <PhoneOff className="h-3 w-3 text-orange-400" />
                  <span className="text-[11px] font-bold text-orange-400">{cncCount}</span>
                </div>
              )}
              {(lead.callCount ?? 0) > 0 && (
                <div className="flex items-center gap-0.5">
                  <Phone className="h-3 w-3 text-sky-400" />
                  <span className="text-[11px] font-bold text-sky-400">{lead.callCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  draggingId: string | null;
  dropTarget: LeadStatus | null;
  localOverrides: Record<string, LeadStatus>;
  canEdit: boolean;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, status: LeadStatus) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: LeadStatus) => void;
  onPreview: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onAddPayment: (lead: Lead) => void;
  onAddReminder: (lead: Lead) => void;
  onAddNote: (lead: Lead) => void;
  onCNC: (leadId: string) => void;
  onCNCDecrement: (leadId: string) => void;
}

function KanbanColumn({
  status, leads, draggingId, dropTarget, localOverrides,
  canEdit, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onPreview, onEdit, onAddPayment, onAddReminder, onAddNote, onCNC, onCNCDecrement,
}: KanbanColumnProps) {
  const style = STATUS_STYLE[status];
  const isDropTarget = dropTarget === status;

  return (
    <div className="flex flex-col w-[240px] sm:w-[220px] shrink-0 h-full snap-start">
      <div className={`flex items-center justify-between gap-2 rounded-t-xl px-3 py-2.5 ${style.header}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
          <span className="text-xs font-semibold truncate">{STATUS_LABELS[status]}</span>
        </div>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums shrink-0 bg-black/10">
          {leads.length}
        </span>
      </div>

      <div
        onDragOver={(e) => canEdit && onDragOver(e, status)}
        onDragLeave={(e) => canEdit && onDragLeave(e)}
        onDrop={(e) => canEdit && onDrop(e, status)}
        className={`flex-1 rounded-b-xl border-x border-b p-2 space-y-2 overflow-y-auto
          transition-all duration-150 min-h-[100px]
          ${isDropTarget
            ? `${style.dropZone} border-2 ring-1 ring-inset`
            : "border-border/40 bg-muted/8"
          }`}
        style={{ maxHeight: "calc(100dvh - 320px)", minHeight: "120px" }}
      >
        <AnimatePresence initial={false}>
          {leads.map((lead) => (
            <KanbanCard
              key={lead._id}
              lead={{ ...lead, status: localOverrides[lead._id] ?? lead.status }}
              isDragging={draggingId === lead._id}
              canEdit={canEdit}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onPreview={onPreview}
              onEdit={onEdit}
              onAddPayment={onAddPayment}
              onAddReminder={onAddReminder}
              onAddNote={onAddNote}
              onCNC={onCNC}
              onCNCDecrement={onCNCDecrement}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {leads.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-center py-8 text-xs rounded-lg border border-dashed transition-colors
                ${isDropTarget
                  ? "border-current text-current opacity-70"
                  : "border-border/30 text-muted-foreground/40"
                }`}
            >
              {isDropTarget ? "↓ Drop here" : "No leads"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

export interface KanbanBoardProps {
  filters: LeadFilters;
  canEdit: boolean;
}

export function KanbanBoard({ filters, canEdit }: KanbanBoardProps) {
  const [draggingId, setDraggingId]         = useState<string | null>(null);
  const [dropTarget, setDropTarget]         = useState<LeadStatus | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, LeadStatus>>({});
  const [previewLead, setPreviewLead]       = useState<Lead | null>(null);
  const [editLead, setEditLead]             = useState<Lead | null>(null);
  const [paymentLead, setPaymentLead]       = useState<Lead | null>(null);
  const [reminderLead, setReminderLead]     = useState<Lead | null>(null);
  const [noteLead, setNoteLead]             = useState<Lead | null>(null);

  const { mutate: updateStatus } = useUpdateLeadStatus();
  const { mutate: updateCNC }    = useUpdateCallNotConnected();

  const { data, isLoading } = useLeads({ ...filters, page: 1, limit: 500 });
  const allLeads = data?.data ?? [];

  const grouped = KANBAN_STATUSES.reduce<Record<LeadStatus, Lead[]>>((acc, s) => {
    acc[s] = [];
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  for (const lead of allLeads) {
    const eff = localOverrides[lead._id] ?? lead.status;
    if (grouped[eff]) grouped[eff].push(lead);
  }

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(leadId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(status);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;
    const lead = allLeads.find((l) => l._id === leadId);
    if (!lead) return;
    const currentStatus = localOverrides[leadId] ?? lead.status;
    setDraggingId(null);
    setDropTarget(null);
    if (currentStatus === targetStatus) return;
    setLocalOverrides((prev) => ({ ...prev, [leadId]: targetStatus }));
    updateStatus(
      { id: leadId, status: targetStatus },
      {
        onSuccess: () => setLocalOverrides((p) => { const n = { ...p }; delete n[leadId]; return n; }),
        onError:   () => setLocalOverrides((p) => { const n = { ...p }; delete n[leadId]; return n; }),
      },
    );
  }, [allLeads, localOverrides, updateStatus]);

  const handleCNC = useCallback((leadId: string) => {
    updateCNC({ leadId, action: "increment" });
  }, [updateCNC]);

  const handleCNCDecrement = useCallback((leadId: string) => {
    updateCNC({ leadId, action: "decrement" });
  }, [updateCNC]);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory">
        {KANBAN_STATUSES.slice(0, 7).map((s) => {
          const style = STATUS_STYLE[s];
          return (
            <div key={s} className="w-[240px] sm:w-[220px] shrink-0 snap-start animate-pulse">
              <div className={`h-9 rounded-t-xl ${style.header} opacity-60`} />
              <div className="rounded-b-xl border border-border/30 bg-muted/10 p-2 space-y-2" style={{ height: 180 }}>
                <div className="h-[76px] rounded-lg bg-muted/50" />
                <div className="h-[60px] rounded-lg bg-muted/40" />
              </div>
            </div>
          );
        })}
        <div className="flex items-center px-2 text-muted-foreground/30 shrink-0">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory sm:snap-none"
        style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
      >
        {KANBAN_STATUSES.map((status, i) => (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025 }}
            className="flex flex-col h-full"
          >
            <KanbanColumn
              status={status}
              leads={grouped[status]}
              draggingId={draggingId}
              dropTarget={dropTarget}
              localOverrides={localOverrides}
              canEdit={canEdit}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPreview={setPreviewLead}
              onEdit={setEditLead}
              onAddPayment={setPaymentLead}
              onAddReminder={setReminderLead}
              onAddNote={setNoteLead}
              onCNC={handleCNC}
              onCNCDecrement={handleCNCDecrement}
            />
          </motion.div>
        ))}
      </motion.div>

      <LeadPreviewPopup
        lead={previewLead}
        open={!!previewLead}
        onClose={() => setPreviewLead(null)}
      />

      <LeadDialog
        open={!!editLead}
        onOpenChange={(o) => { if (!o) setEditLead(null); }}
        lead={editLead}
        mode="edit"
      />

      {paymentLead && (
        <QuickPaymentDialog
          lead={paymentLead}
          open={!!paymentLead}
          onClose={() => setPaymentLead(null)}
        />
      )}

      {reminderLead && (
        <QuickReminderDialog
          lead={reminderLead}
          open={!!reminderLead}
          onClose={() => setReminderLead(null)}
        />
      )}

      {noteLead && (
        <QuickNotesDialog
          lead={noteLead}
          open={!!noteLead}
          onClose={() => setNoteLead(null)}
        />
      )}
    </>
  );
}
