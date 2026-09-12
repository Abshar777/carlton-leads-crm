/**
 * Carlton CRM — Lead statuses (single source of truth, frontend)
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors backend/src/constants/leadStatus.ts. Add a status once, here, and
 * import LEAD_STATUSES / STATUS_LABELS / STATUS_COLORS everywhere else.
 */

/** Statuses any user may set. */
export const GENERAL_LEAD_STATUSES = [
  "new", "assigned", "followup", "closed", "invalid", "cnc", "booking",
  "notinterested", "interested", "rnr", "callback", "whatsapp", "student",
] as const;

/**
 * Statuses only Closing-team members may SET. Everyone can still see them on a
 * lead and filter by them — the restriction is on writing, not reading, and it
 * is enforced server-side. Hiding them in the UI is convenience, not security.
 */
export const CLOSING_ONLY_STATUSES = [
  "nextbatch", "reschedule", "paid100", "paid200", "paid500",
] as const;

export const LEAD_STATUSES = [
  ...GENERAL_LEAD_STATUSES,
  ...CLOSING_ONLY_STATUSES,
] as const;

export type LeadStatus = typeof LEAD_STATUSES[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new:            "New",
  assigned:       "Assigned",
  followup:       "Follow Up",
  closed:         "Closed",
  invalid:        "Invalid",
  cnc:            "CNC",
  booking:        "Booking",
  notinterested:  "Not Interested",
  interested:     "Interested",
  rnr:            "RNR",
  callback:       "Call Back",
  whatsapp:       "WhatsApp",
  student:        "Student",
  // Closing-only
  nextbatch:      "Next Batch",
  reschedule:     "Re-Schedule",
  paid100:        "100 $",
  paid200:        "200 $",
  paid500:        "500 $",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new:            "bg-blue-500/15 text-blue-400 border-blue-500/30",
  assigned:       "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  followup:       "bg-orange-500/15 text-orange-400 border-orange-500/30",
  closed:         "bg-green-500/15 text-green-400 border-green-500/30",
  invalid:        "bg-red-500/15 text-red-400 border-red-500/30",
  cnc:            "bg-slate-500/15 text-slate-400 border-slate-500/30",
  booking:        "bg-teal-500/15 text-teal-400 border-teal-500/30",
  notinterested:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  interested:     "bg-violet-500/15 text-violet-400 border-violet-500/30",
  rnr:            "bg-amber-500/15 text-amber-400 border-amber-500/30",
  callback:       "bg-sky-500/15 text-sky-400 border-sky-500/30",
  whatsapp:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  student:        "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  // Closing-only — money stages share a green family, scheduling a purple one
  nextbatch:      "bg-purple-500/15 text-purple-400 border-purple-500/30",
  reschedule:     "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  paid100:        "bg-lime-500/15 text-lime-400 border-lime-500/30",
  paid200:        "bg-green-600/15 text-green-400 border-green-600/30",
  paid500:        "bg-emerald-600/15 text-emerald-300 border-emerald-600/30",
};


/** Kanban column styling, keyed by status. */
export const STATUS_STYLE_BY_STATUS: Record<LeadStatus, {
  header: string; border: string; dot: string; dropZone: string; badge: string;
}> = {
  new:            { header: "bg-blue-500/15 text-blue-400", border: "border-blue-500/25", dot: "bg-blue-400", dropZone: "border-blue-500/50 bg-blue-500/5", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  assigned:       { header: "bg-yellow-500/15 text-yellow-400", border: "border-yellow-500/25", dot: "bg-yellow-400", dropZone: "border-yellow-500/50 bg-yellow-500/5", badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  followup:       { header: "bg-orange-500/15 text-orange-400", border: "border-orange-500/25", dot: "bg-orange-400", dropZone: "border-orange-500/50 bg-orange-500/5", badge: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  interested:     { header: "bg-violet-500/15 text-violet-400", border: "border-violet-500/25", dot: "bg-violet-400", dropZone: "border-violet-500/50 bg-violet-500/5", badge: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  cnc:            { header: "bg-slate-500/15 text-slate-400", border: "border-slate-500/25", dot: "bg-slate-400", dropZone: "border-slate-500/50 bg-slate-500/5", badge: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  booking:        { header: "bg-teal-500/15 text-teal-400", border: "border-teal-500/25", dot: "bg-teal-400", dropZone: "border-teal-500/50 bg-teal-500/5", badge: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  notinterested:  { header: "bg-orange-500/15 text-orange-400", border: "border-orange-500/25", dot: "bg-orange-400", dropZone: "border-orange-500/50 bg-orange-500/5", badge: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  closed:         { header: "bg-green-500/15 text-green-400", border: "border-green-500/25", dot: "bg-green-400", dropZone: "border-green-500/50 bg-green-500/5", badge: "bg-green-500/15 text-green-400 border-green-500/30" },
  invalid:        { header: "bg-red-500/15 text-red-400", border: "border-red-500/25", dot: "bg-red-400", dropZone: "border-red-500/50 bg-red-500/5", badge: "bg-red-500/15 text-red-400 border-red-500/30" },
  rnr:            { header: "bg-amber-500/15 text-amber-400", border: "border-amber-500/25", dot: "bg-amber-400", dropZone: "border-amber-500/50 bg-amber-500/5", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  callback:       { header: "bg-sky-500/15 text-sky-400", border: "border-sky-500/25", dot: "bg-sky-400", dropZone: "border-sky-500/50 bg-sky-500/5", badge: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  whatsapp:       { header: "bg-emerald-500/15 text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-400", dropZone: "border-emerald-500/50 bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  student:        { header: "bg-indigo-500/15 text-indigo-400", border: "border-indigo-500/25", dot: "bg-indigo-400", dropZone: "border-indigo-500/50 bg-indigo-500/5", badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  nextbatch:      { header: "bg-purple-500/15 text-purple-400", border: "border-purple-500/25", dot: "bg-purple-400", dropZone: "border-purple-500/50 bg-purple-500/5", badge: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  reschedule:     { header: "bg-fuchsia-500/15 text-fuchsia-400", border: "border-fuchsia-500/25", dot: "bg-fuchsia-400", dropZone: "border-fuchsia-500/50 bg-fuchsia-500/5", badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30" },
  paid100:        { header: "bg-lime-500/15 text-lime-400", border: "border-lime-500/25", dot: "bg-lime-400", dropZone: "border-lime-500/50 bg-lime-500/5", badge: "bg-lime-500/15 text-lime-400 border-lime-500/30" },
  paid200:        { header: "bg-green-500/15 text-green-400", border: "border-green-500/25", dot: "bg-green-400", dropZone: "border-green-500/50 bg-green-500/5", badge: "bg-green-500/15 text-green-400 border-green-500/30" },
  paid500:        { header: "bg-emerald-500/15 text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-400", dropZone: "border-emerald-500/50 bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

const CLOSING_ONLY_SET = new Set<string>(CLOSING_ONLY_STATUSES);

export function isClosingOnlyStatus(status: string): boolean {
  return CLOSING_ONLY_SET.has(status);
}

/**
 * Statuses this user may SET. Closing-only values are dropped unless the user is
 * on the Closing team or a Super Admin. Filtering options stay unrestricted —
 * everyone may filter by every status.
 */
export function settableStatuses(canSetClosingOnly: boolean): readonly LeadStatus[] {
  return canSetClosingOnly ? LEAD_STATUSES : GENERAL_LEAD_STATUSES;
}
