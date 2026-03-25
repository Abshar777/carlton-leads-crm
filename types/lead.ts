import type { User } from "@/types";
import type { Team } from "@/types/team";
import type { Course } from "@/types/course";

export type LeadStatus = "new" | "assigned" | "followup" | "closed" | "rejected" | "cnc" | "booking" | "interested";

export type ActivityAction =
  | "lead_created"
  | "lead_updated"
  | "status_changed"
  | "lead_assigned"
  | "team_assigned"
  | "note_added"
  | "note_updated"
  | "note_deleted";

export interface LeadNote {
  _id: string;
  content: string;
  author: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  action: ActivityAction;
  description: string;
  performedBy: User | string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  createdAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: LeadStatus;
  course?: Course | string | null;
  assignedTo?: User | string | null;
  team?: Team | string | null;
  reporter?: User | string | null;
  notes: LeadNote[];
  activityLogs: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: string;
  assignedTo?: string;
  team?: string;
  reporter?: string;
  course?: string;
  search?: string;
  /** YYYY-MM-DD — leads created on or after this date */
  dateFrom?: string;
  /** YYYY-MM-DD — leads created on or before this date */
  dateTo?: string;
}

export interface LeadStats {
  total: number;
  new: number;
  assigned: number;
  followup: number;
  closed: number;
  rejected: number;
  cnc: number;
  booking: number;
  interested: number;
}

export interface InvalidRow {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
}

export interface UploadLeadsResult {
  total: number;
  created: number;
  assigned: number;
  invalid: number;
  invalidDetails: InvalidRow[];
}

export interface AutoAssignResult {
  assigned: number;
  results: { leadId: string; assignedTo: string }[];
}
