"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";
import { useAuthStore } from "@/lib/store/authStore";
import { getSocket } from "@/lib/socket";

export type CallAction = "called" | "updated" | "rejected" | "break";

export interface CallSessionLead { _id: string; name: string; phone?: string; status: string }
export interface CallSession {
  _id: string;
  lead?: CallSessionLead | null;
  promptedAt: string;
}
export interface MySessionState {
  onShift: boolean;
  mode?: "off" | "full" | "half";
  breakEndsAt: string | null;
  session: CallSession | null;
}

const KEY = ["call-automation", "my-session"] as const;

export function useMyCallSession() {
  const qc = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();

  const query = useQuery<MySessionState>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<MySessionState>>("/call-automation/my-session");
      return res.data.data!;
    },
    enabled: isAuthenticated,
    // Safety net: the socket does the real work, but a poll means a dropped
    // connection cannot leave someone with no prompts for the rest of a shift.
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!accessToken || !isAuthenticated) return;
    const socket = getSocket(accessToken);
    const onPrompt = () => qc.invalidateQueries({ queryKey: KEY });
    socket.on("call:prompt", onPrompt);
    return () => { socket.off("call:prompt", onPrompt); };
  }, [accessToken, isAuthenticated, qc]);

  return query;
}

export function useRespondToCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, action, rejectReason }: { sessionId: string; action: CallAction; rejectReason?: string }) => {
      const res = await api.post(`/call-automation/sessions/${sessionId}/respond`, { action, rejectReason });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Could not record that");
    },
  });
}

export function useEndBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/call-automation/break/end")).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Break ended"); },
  });
}
