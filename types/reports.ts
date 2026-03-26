export type LeadStatus =
  | "new"
  | "assigned"
  | "followup"
  | "interested"
  | "cnc"
  | "booking"
  | "closed"
  | "rejected";

// ── Overview ──────────────────────────────────────────────────────────────────

export interface ReportSummary {
  total:          number;
  closed:         number;
  conversionRate: number;
  activeTeams:    number;
  totalTeams:     number;
  activeUsers:    number;
}

export interface StatusDistributionItem {
  status: LeadStatus;
  count:  number;
  pct:    number;
}

export interface SourceDistributionItem {
  source: string;
  count:  number;
}

export interface OverviewReport {
  summary:            ReportSummary;
  statusDistribution: StatusDistributionItem[];
  sourceDistribution: SourceDistributionItem[];
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export type TimelinePeriod = "daily" | "weekly" | "monthly";

export interface TimelinePoint {
  label:     string;
  total:     number;
  new:       number;
  assigned:  number;
  followup:  number;
  interested:number;
  cnc:       number;
  booking:   number;
  closed:    number;
  rejected:  number;
}

// ── User Rankings ─────────────────────────────────────────────────────────────

export interface UserRankItem {
  rank:           number;
  userId:         string;
  name:           string;
  email:          string;
  designation?:   string;
  total:          number;
  new:            number;
  assigned:       number;
  followup:       number;
  interested:     number;
  cnc:            number;
  booking:        number;
  closed:         number;
  rejected:       number;
  conversionRate: number;
}

// ── Team Rankings ─────────────────────────────────────────────────────────────

export interface TeamRankItem {
  rank:           number;
  teamId:         string;
  name:           string;
  description?:   string;
  memberCount:    number;
  total:          number;
  new:            number;
  assigned:       number;
  followup:       number;
  interested:     number;
  cnc:            number;
  booking:        number;
  closed:         number;
  rejected:       number;
  conversionRate: number;
}

// ── Team Split ────────────────────────────────────────────────────────────────

export type SplitPeriod = "daily" | "weekly" | "monthly" | "yearly";

/** One time-bucket row in the chart — dynamic keys for each team name */
export type TeamSplitPoint = {
  label: string;
  total: number;
  [teamName: string]: number | string;
};

export interface TeamSplitSummaryItem {
  rank:           number;
  teamName:       string;
  total:          number;
  new:            number;
  assigned:       number;
  followup:       number;
  interested:     number;
  cnc:            number;
  booking:        number;
  closed:         number;
  rejected:       number;
  conversionRate: number;
}

export interface TeamSplitReport {
  teams:    string[];                  // unique team names (for chart series)
  timeline: TeamSplitPoint[];          // per-bucket rows
  summary:  TeamSplitSummaryItem[];    // team totals for the table
}

// ── Filter state ──────────────────────────────────────────────────────────────

export interface ReportFilters {
  dateFrom: string;
  dateTo:   string;
  period:   TimelinePeriod;
}
