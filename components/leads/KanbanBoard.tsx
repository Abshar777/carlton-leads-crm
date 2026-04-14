"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Eye, Loader2, Phone, Mail, User2, ExternalLink,
  Calendar, Clock, BookOpen, Users, StickyNote, Bell, PhoneOff, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useLeads, useUpdateLeadStatus } from "@/hooks/useLeads";
import { getInitials, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, LeadFilters } from "@/types/lead";
import type { User } from "@/types";
import type { Course } from "@/types/course";
import type { Team } from "@/types/team";

// ─── Config ───────────────────────────────────────────────────────────────────

const KANBAN_STATUSES: LeadStatus[] = [
  "new", "assigned", "followup", "interested", "cnc",
  "booking", "partialbooking", "closed", "rejected",
  "rnr", "callback", "whatsapp", "student",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:            "New",
  assigned:       "Assigned",
  followup:       "Follow Up",
  interested:     "Interested",
  cnc:            "CNC",
  booking:        "Booking",
  partialbooking: "Partial Booking",
  closed:         "Closed",
  rejected:       "Rejected",
  rnr:            "RNR",
  callback:       "Call Back",
  whatsapp:       "WhatsApp",
  student:        "Student",
};

const STATUS_STYLE: Record<LeadStatus, {
  header: string; border: string; dot: string; dropZone: string; badge: string;
}> = {
  new:            { header: "bg-blue-500/15 text-blue-400",       border: "border-blue-500/25",    dot: "bg-blue-400",    dropZone: "border-blue-500/50 bg-blue-500/5",    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30"       },
  assigned:       { header: "bg-yellow-500/15 text-yellow-400",   border: "border-yellow-500/25",  dot: "bg-yellow-400",  dropZone: "border-yellow-500/50 bg-yellow-500/5",  badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"   },
  followup:       { header: "bg-orange-500/15 text-orange-400",   border: "border-orange-500/25",  dot: "bg-orange-400",  dropZone: "border-orange-500/50 bg-orange-500/5",  badge: "bg-orange-500/15 text-orange-400 border-orange-500/30"   },
  interested:     { header: "bg-violet-500/15 text-violet-400",   border: "border-violet-500/25",  dot: "bg-violet-400",  dropZone: "border-violet-500/50 bg-violet-500/5",  badge: "bg-violet-500/15 text-violet-400 border-violet-500/30"   },
  cnc:            { header: "bg-slate-500/15 text-slate-400",     border: "border-slate-500/25",   dot: "bg-slate-400",   dropZone: "border-slate-500/50 bg-slate-500/5",   badge: "bg-slate-500/15 text-slate-400 border-slate-500/30"       },
  booking:        { header: "bg-teal-500/15 text-teal-400",       border: "border-teal-500/25",    dot: "bg-teal-400",    dropZone: "border-teal-500/50 bg-teal-500/5",    badge: "bg-teal-500/15 text-teal-400 border-teal-500/30"         },
  partialbooking: { header: "bg-pink-500/15 text-pink-400",       border: "border-pink-500/25",    dot: "bg-pink-400",    dropZone: "border-pink-500/50 bg-pink-500/5",    badge: "bg-pink-500/15 text-pink-400 border-pink-500/30"         },
  closed:         { header: "bg-green-500/15 text-green-400",     border: "border-green-500/25",   dot: "bg-green-400",   dropZone: "border-green-500/50 bg-green-500/5",   badge: "bg-green-500/15 text-green-400 border-green-500/30"       },
  rejected:       { header: "bg-red-500/15 text-red-400",         border: "border-red-500/25",     dot: "bg-red-400",     dropZone: "border-red-500/50 bg-red-500/5",     badge: "bg-red-500/15 text-red-400 border-red-500/30"           },
  rnr:            { header: "bg-amber-500/15 text-amber-400",     border: "border-amber-500/25",   dot: "bg-amber-400",   dropZone: "border-amber-500/50 bg-amber-500/5",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/30"       },
  callback:       { header: "bg-sky-500/15 text-sky-400",         border: "border-sky-500/25",     dot: "bg-sky-400",     dropZone: "border-sky-500/50 bg-sky-500/5",     badge: "bg-sky-500/15 text-sky-400 border-sky-500/30"           },
  whatsapp:       { header: "bg-emerald-500/15 text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-400", dropZone: "border-emerald-500/50 bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  student:        { header: "bg-indigo-500/15 text-indigo-400",   border: "border-indigo-500/25",  dot: "bg-indigo-400",  dropZone: "border-indigo-500/50 bg-indigo-500/5",  badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"   },
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

// ─── Lead Preview Popup ───────────────────────────────────────────────────────

export interface LeadPreviewProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

// Shared popup body — works inside both Dialog and Sheet (same Radix root)
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
      {/* Header */}
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

      {/* Body */}
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
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { icon: StickyNote, label: "Notes",     value: lead.notes?.length ?? 0,    color: "text-blue-400"   },
            { icon: Bell,       label: "Reminders", value: lead.reminders?.length ?? 0, color: "text-violet-400" },
            { icon: PhoneOff,   label: "CNC",       value: lead.callNotConnected ?? 0,  color: "text-orange-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-border/40 bg-muted/20 py-2.5">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-sm font-bold text-foreground">{value}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
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

  // Mobile → bottom sheet drawer
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          hideClose
          className="p-0 rounded-t-2xl max-h-[90dvh] overflow-hidden gap-0 flex flex-col"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <LeadPreviewBody lead={lead} onClose={onClose} onViewFull={handleViewFull} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop → centered dialog
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
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onPreview: (lead: Lead) => void;
}

function KanbanCard({ lead, isDragging, onDragStart, onDragEnd, onPreview }: KanbanCardProps) {
  const style = STATUS_STYLE[lead.status];
  const assignedName = getUserName(lead.assignedTo as User | string | null);

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
      {/* Coloured left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${style.dot}`} />

      <div className="p-3 pl-4">
        {/* Top row — avatar + name + eye */}
        <div className="flex items-start gap-2 mb-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold mt-0.5">
            {getInitials(lead.name)}
          </div>
          <p className="flex-1 text-sm font-semibold text-foreground leading-tight break-words min-w-0">
            {lead.name}
          </p>
          {/* Eye — always visible on mobile, hover on desktop */}
          <button
            draggable={false}
            onClick={(e) => { e.stopPropagation(); onPreview(lead); }}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md
              text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors
              sm:opacity-0 sm:group-hover:opacity-100 opacity-100"
            title="Quick view"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Phone */}
        {lead.phone && (
          <div className="flex items-center gap-1.5 mb-2">
            <Phone className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="text-[11px] font-mono text-muted-foreground">{lead.phone}</span>
          </div>
        )}

        {/* Bottom — assigned + CNC */}
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
          {(lead.callNotConnected ?? 0) > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <PhoneOff className="h-3 w-3 text-orange-400" />
              <span className="text-[11px] font-bold text-orange-400">{lead.callNotConnected}</span>
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
}

function KanbanColumn({
  status, leads, draggingId, dropTarget, localOverrides,
  canEdit, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onPreview,
}: KanbanColumnProps) {
  const style = STATUS_STYLE[status];
  const isDropTarget = dropTarget === status;

  return (
    <div className="flex flex-col w-[240px] sm:w-[220px] shrink-0 h-full snap-start">
      {/* Column header */}
      <div className={`flex items-center justify-between gap-2 rounded-t-xl px-3 py-2.5 ${style.header}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
          <span className="text-xs font-semibold truncate">{STATUS_LABELS[status]}</span>
        </div>
        <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums shrink-0 bg-black/10`}>
          {leads.length}
        </span>
      </div>

      {/* Cards area / drop zone */}
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
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onPreview={onPreview}
            />
          ))}
        </AnimatePresence>

        {/* Empty drop target indicator */}
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
  const [draggingId, setDraggingId]       = useState<string | null>(null);
  const [dropTarget, setDropTarget]       = useState<LeadStatus | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, LeadStatus>>({});
  const [previewLead, setPreviewLead]     = useState<Lead | null>(null);

  const { mutate: updateStatus } = useUpdateLeadStatus();

  const { data, isLoading } = useLeads({ ...filters, page: 1, limit: 500 });
  const allLeads = data?.data ?? [];

  // Group leads by effective status
  const grouped = KANBAN_STATUSES.reduce<Record<LeadStatus, Lead[]>>((acc, s) => {
    acc[s] = [];
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  for (const lead of allLeads) {
    const eff = localOverrides[lead._id] ?? lead.status;
    if (grouped[eff]) grouped[eff].push(lead);
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
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

  // Only clear drop target if leaving the board entirely (not entering a child)
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

    // Optimistic — move card instantly
    setLocalOverrides((prev) => ({ ...prev, [leadId]: targetStatus }));

    updateStatus(
      { id: leadId, status: targetStatus },
      {
        onSuccess: () => setLocalOverrides((p) => { const n = { ...p }; delete n[leadId]; return n; }),
        onError:   () => setLocalOverrides((p) => { const n = { ...p }; delete n[leadId]; return n; }),
      },
    );
  }, [allLeads, localOverrides, updateStatus]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
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
      {/* Board */}
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
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Lead Preview Popup */}
      <LeadPreviewPopup
        lead={previewLead}
        open={!!previewLead}
        onClose={() => setPreviewLead(null)}
      />
    </>
  );
}
