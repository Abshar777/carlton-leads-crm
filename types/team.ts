import type { User } from "@/types";

export interface Team {
  _id: string;
  name: string;
  description?: string;
  leaders: User[];
  members: User[];
  status: "active" | "inactive";
  leadStats?: {
    teamId: string;
    total: number;
    unassigned: number;
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
  interested: number;
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
  interested: number;
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
    interested: number;
  };
  memberRankings: TeamMemberRanking[];
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
