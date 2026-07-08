"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneOff, RefreshCw, ChevronRight,
  CheckCircle2, Clock, Layers,
} from "lucide-react";
import Link from "next/link";
import { useMyQueue } from "@/hooks/useLeads";
import { TagBadge } from "@/components/tags/TagBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/lead";
import type { Tag } from "@/types/tag";

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

// ─── Status badge colours ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  assigned:      { label: "Assigned",    className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  cnc:           { label: "CNC",         className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  followup:      { label: "Follow Up",   className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  interested:    { label: "Interested",  className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, type }: { lead: Lead; type: "assigned" | "cnc" }) {
  const lastNote = lead.notes?.[lead.notes.length - 1];
  const tags = (lead.tags ?? []).filter((t): t is Tag => typeof t === "object");

  return (
    <motion.div variants={itemVariants}>
      <Link href={`/leads/${lead._id}`}>
        <Card className="group hover:border-primary/40 transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">

                {/* Name + status */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-foreground truncate">{lead.name}</span>
                  {statusBadge(lead.status)}
                  {type === "cnc" && lead.callNotConnected > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                      <PhoneOff className="h-3 w-3" />
                      {lead.callNotConnected}× not connected
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{lead.phone}</span>
                  {lead.course && typeof lead.course === "object" && (
                    <>
                      <span className="text-border">·</span>
                      <span className="truncate">{(lead.course as { name: string }).name}</span>
                    </>
                  )}
                </div>

                {/* Last note */}
                {lastNote && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    📝 {typeof lastNote === "object" ? lastNote.content : String(lastNote)}
                  </p>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.slice(0, 3).map((t) => (
                      <TagBadge key={t._id} tag={t} size="xs" />
                    ))}
                    {tags.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, leads, type, accent, emptyMsg,
}: {
  title: string;
  icon: React.ElementType;
  leads: Lead[];
  type: "assigned" | "cnc";
  accent: string;
  emptyMsg: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", accent)} />
        <h2 className="font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary" className="ml-auto">{leads.length}</Badge>
      </div>

      <AnimatePresence mode="wait">
        {leads.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl"
          >
            {emptyMsg}
          </motion.p>
        ) : (
          <motion.div
            key="list"
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {leads.map((lead) => (
              <LeadCard key={lead._id} lead={lead} type={type} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyQueuePage() {
  const { data, isLoading, refetch, isFetching } = useMyQueue();
  const [activeSection, setActiveSection] = useState<"all" | "assigned" | "cnc">("all");

  const assigned = data?.assigned ?? [];
  const cnc      = data?.cnc      ?? [];
  const total    = data?.totalCount ?? 0;

  const displayAssigned = activeSection === "cnc"      ? [] : assigned;
  const displayCnc      = activeSection === "assigned" ? [] : cnc;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Today&apos;s Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your assigned leads + CNC leads due for recall today
          </p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { key: "all",      label: "Total",    value: total,          icon: Layers,       accent: "text-primary"       },
            { key: "assigned", label: "Assigned", value: assigned.length, icon: CheckCircle2, accent: "text-blue-500"      },
            { key: "cnc",      label: "CNC",      value: cnc.length,      icon: Clock,        accent: "text-orange-500"    },
          ].map(({ key, label, value, icon: Icon, accent }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key as "all" | "assigned" | "cnc")}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 transition-all",
                activeSection === key
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border hover:border-primary/20"
              )}
            >
              <Icon className={cn("h-5 w-5", accent)} />
              <span className="text-xl font-bold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Sections */}
      {!isLoading && (
        <div className="space-y-8">
          {(activeSection === "all" || activeSection === "assigned") && (
            <Section
              title="Assigned Leads"
              icon={CheckCircle2}
              leads={displayAssigned}
              type="assigned"
              accent="text-blue-500"
              emptyMsg="No assigned leads right now 🎉"
            />
          )}
          {(activeSection === "all" || activeSection === "cnc") && (
            <Section
              title="CNC — Due for Recall Today"
              icon={PhoneOff}
              leads={displayCnc}
              type="cnc"
              accent="text-orange-500"
              emptyMsg="No CNC leads due for recall today"
            />
          )}
          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-foreground">All clear!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No leads in your queue right now.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
