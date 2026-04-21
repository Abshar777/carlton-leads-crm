import type { User } from "@/types";

export interface TeamSettings {
  autoAssign: boolean;
  splitMode: "round_robin" | "equal_load";
  roundRobinIndex: number;
  includedMembers: string[];
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  leaders: User[];
  members: User[];
  status: "active" | "inactive";
  /** Member IDs excluded from auto-assignment within this team (team-scoped) */
  inactiveMembers: string[];
  settings?: TeamSettings;
  leadStats?: {
    teamId: string;
    total: number;
    unassigned: number;
    thisMonth: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TeamFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface TeamMemberStat {
  user: Pick<User, "_id" | "name" | "email" | "designation">;
  total: number;
  assigned: number;
  followup: number;
  closed: number;
  rejected: number;
  cnc: number;
  booking: number;
  partialbooking: number;
  interested: number;
  rnr: number;
  callback: number;
  whatsapp: number;
  student: number;
  totalPayments: number;
}

export interface TeamAutoAssignResult {
  assigned: number;
  results: { leadId: string; assignedTo: string }[];
}

export interface TeamMemberRanking {
  user: Pick<User, "_id" | "name" | "email" | "designation">;
  isLeader: boolean;
  total: number;
  assigned: number;
  followup: number;
  closed: number;
  rejected: number;
  cnc: number;
  booking: number;
  partialbooking: number;
  interested: number;
  rnr: number;
  callback: number;
  whatsapp: number;
  student: number;
  totalPayments: number;
  closureRate: number;
}

export interface TeamDashboard {
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
    partialbooking: number;
    interested: number;
    rnr: number;
    callback: number;
    whatsapp: number;
    student: number;
  };
  memberRankings: TeamMemberRanking[];
}

// ── Team Reminder ─────────────────────────────────────────────────────────────
export interface TeamReminderItem {
  reminder: {
    _id: string;
    title?: string;
    note?: string;
    remindAt: string;
    isDone: boolean;
    createdBy?: { _id: string; name: string } | string;
    notifiedAt?: string;
    warnedAt?: string;
    createdAt?: string;
  };
  lead: {
    _id: string;
    name: string;
    phone?: string;
    status: import("@/types/lead").LeadStatus;
    assignedTo?: { _id: string; name: string; email: string; designation?: string } | null;
  };
}

export interface TeamLog {
  _id: string;
  action: string;
  description: string;
  performedBy: { _id: string; name: string; email: string } | string;
  leadId: string;
  leadName: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  createdAt: string;
}

/** A chat message posted by a team member */
export interface TeamMessageItem {
  _id:       string;
  type:      "message";
  team:      string;
  author:    { _id: string; name: string; email: string; designation?: string };
  content:   string;
  createdAt: string;
  updatedAt: string;
}

/** A lead activity event surfaced in the updates feed */
export interface TeamActivityItem {
  _id:         string;
  type:        "activity";
  action:      string;
  description: string;
  performedBy: { _id: string; name: string; email: string } | null;
  leadId:      string;
  leadName:    string;
  changes?:    Record<string, { from: unknown; to: unknown }>;
  createdAt:   string;
}

export type TeamUpdateItem = TeamMessageItem | TeamActivityItem;
