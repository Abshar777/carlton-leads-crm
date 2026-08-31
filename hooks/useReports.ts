import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  OverviewReport,
  TimelinePoint,
  UserRankItem,
  TeamRankItem,
  TimelinePeriod,
  TeamSplitReport,
  SplitPeriod,
  RevenuePeriod,
  RevenueOverview,
  RevenueTimelineReport,
  RevenueTeamDetail,
  SourceAnalyticsItem,
  CampaignBreakdownItem,
} from "@/types/reports";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function useReportOverview(dateFrom: string, dateTo: string) {
  return useQuery<OverviewReport>({
    queryKey: ["reports", "overview", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<OverviewReport>>(
        `/reports/overview?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export function useReportTimeline(
  period: TimelinePeriod,
  dateFrom: string,
  dateTo: string,
) {
  return useQuery<TimelinePoint[]>({
    queryKey: ["reports", "timeline", period, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<TimelinePoint[]>>(
        `/reports/timeline?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── User Rankings ─────────────────────────────────────────────────────────────

export function useReportUserRankings(dateFrom: string, dateTo: string) {
  return useQuery<UserRankItem[]>({
    queryKey: ["reports", "users", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "20" });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<UserRankItem[]>>(
        `/reports/users?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── Team Rankings ─────────────────────────────────────────────────────────────

export function useReportTeamRankings(dateFrom: string, dateTo: string) {
  return useQuery<TeamRankItem[]>({
    queryKey: ["reports", "teams", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<TeamRankItem[]>>(
        `/reports/teams?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── Team Split ────────────────────────────────────────────────────────────────

export function useReportTeamSplit(
  period: SplitPeriod,
  dateFrom: string,
  dateTo: string,
) {
  return useQuery<TeamSplitReport>({
    queryKey: ["reports", "team-split", period, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<TeamSplitReport>>(
        `/reports/team-split?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── Revenue Overview ──────────────────────────────────────────────────────────

export function useRevenueOverview(dateFrom: string, dateTo: string) {
  return useQuery<RevenueOverview>({
    queryKey: ["reports", "revenue", "overview", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<RevenueOverview>>(
        `/reports/revenue/overview?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── Revenue Timeline ──────────────────────────────────────────────────────────

export function useRevenueTimeline(
  period: RevenuePeriod,
  dateFrom: string,
  dateTo: string,
) {
  return useQuery<RevenueTimelineReport>({
    queryKey: ["reports", "revenue", "timeline", period, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<RevenueTimelineReport>>(
        `/reports/revenue/timeline?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── Source Analytics ──────────────────────────────────────────────────────────

export function useSourceAnalytics(dateFrom: string, dateTo: string, teamId?: string) {
  return useQuery<SourceAnalyticsItem[]>({
    queryKey: ["reports", "sources", dateFrom, dateTo, teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      if (teamId)   params.set("team",     teamId);
      const { data } = await api.get<ApiResponse<SourceAnalyticsItem[]>>(
        `/reports/sources?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useCampaignBreakdown(source: string, dateFrom: string, dateTo: string) {
  return useQuery<CampaignBreakdownItem[]>({
    queryKey: ["reports", "sources", source, "campaigns", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<CampaignBreakdownItem[]>>(
        `/reports/sources/${encodeURIComponent(source)}/campaigns?${params}`,
      );
      return data.data;
    },
    enabled: !!source,
    staleTime: 60_000,
  });
}

// ── Revenue Teams (with member breakdown) ─────────────────────────────────────

export function useRevenueTeams(dateFrom: string, dateTo: string) {
  return useQuery<RevenueTeamDetail[]>({
    queryKey: ["reports", "revenue", "teams", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const { data } = await api.get<ApiResponse<RevenueTeamDetail[]>>(
        `/reports/revenue/teams?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── Bookings / Closings Reports ───────────────────────────────────────────────

export interface StatusReportFilters {
  dateFrom?: string;
  dateTo?: string;
  /** Which date field the date range applies to: bookedAt | createdAt | updatedAt */
  dateField?: string;
  /** Sort field: bookedAt | createdAt | updatedAt */
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  search?: string;
  team?: string;
  assignedTo?: string;
}

/** @deprecated use StatusReportFilters */
export type BookingReportFilters = StatusReportFilters;

function buildStatusReportHook(endpoint: string) {
  return (filters: StatusReportFilters) =>
    useQuery({
      queryKey: ["reports", endpoint, filters],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters.dateFrom)   params.set("dateFrom",   filters.dateFrom);
        if (filters.dateTo)     params.set("dateTo",     filters.dateTo);
        if (filters.dateField)  params.set("dateField",  filters.dateField);
        if (filters.sortBy)     params.set("sortBy",     filters.sortBy);
        if (filters.sortOrder)  params.set("sortOrder",  filters.sortOrder);
        if (filters.page)       params.set("page",       String(filters.page));
        if (filters.limit)      params.set("limit",      String(filters.limit));
        if (filters.search)     params.set("search",     filters.search);
        if (filters.team)       params.set("team",       filters.team);
        if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
        const { data } = await api.get(`/reports/${endpoint}?${params}`);
        return data.data as {
          data: import("@/types/lead").Lead[];
          pagination: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
        };
      },
      staleTime: 30_000,
    });
}

export const useBookingsReport = buildStatusReportHook("bookings");
export const useClosingsReport = buildStatusReportHook("closings");
