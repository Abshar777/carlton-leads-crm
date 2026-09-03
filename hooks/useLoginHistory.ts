"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface LoginEvent {
  _id: string;
  user: { _id: string; name: string; email: string };
  type: "login" | "logout";
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface LoginHistoryResponse {
  events: LoginEvent[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Filters {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export function useLoginHistory(filters: Filters = {}) {
  return useQuery<LoginHistoryResponse>({
    queryKey: ["login-history", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.userId)   params.set("userId",   filters.userId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo)   params.set("dateTo",   filters.dateTo);
      if (filters.page)     params.set("page",     String(filters.page));
      if (filters.limit)    params.set("limit",    String(filters.limit));
      const { data } = await api.get(`/auth/login-history?${params}`);
      return data.data;
    },
  });
}
