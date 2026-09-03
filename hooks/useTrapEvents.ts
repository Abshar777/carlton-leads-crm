"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store/authStore";
import { getSocket } from "@/lib/socket";

export type TrapAction =
  | "download_leads"
  | "copy_phone"
  | "print_attempt"
  | "screenshot_attempt"
  | "whatsapp_share";

export interface TrapEvent {
  _id: string;
  user: { _id: string; name: string; email: string };
  action: TrapAction;
  leadId?: { _id: string; name: string; contactNo?: string } | null;
  leadName?: string;
  phoneNumber?: string;
  page?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface TrapEventsResponse {
  events: TrapEvent[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Filters {
  action?: TrapAction | "";
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export function useTrapEvents(filters: Filters = {}) {
  return useQuery<TrapEventsResponse>({
    queryKey: ["traps", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.action)   params.set("action",   filters.action);
      if (filters.userId)   params.set("userId",   filters.userId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo)   params.set("dateTo",   filters.dateTo);
      if (filters.page)     params.set("page",     String(filters.page));
      if (filters.limit)    params.set("limit",    String(filters.limit));
      const { data } = await api.get(`/traps?${params}`);
      return data.data;
    },
  });
}

export function useTrapUnreadCount() {
  return useQuery<number>({
    queryKey: ["traps", "unread"],
    queryFn: async () => {
      const { data } = await api.get("/traps/unread-count");
      return data.data.count as number;
    },
    refetchInterval: 60_000,
  });
}

// Call this once in the security alerts page to get real-time alerts
export function useTrapSocket() {
  const qc = useQueryClient();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function handler() {
      qc.invalidateQueries({ queryKey: ["traps"] });
    }

    socket.on("trap:alert", handler);
    return () => { socket.off("trap:alert", handler); };
  }, [accessToken, qc]);
}
