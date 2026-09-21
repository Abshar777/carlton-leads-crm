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
export const CALL_RESULTS = [
  { value: "connected",   label: "Connected" },
  { value: "noanswer",    label: "No Answer" },
  { value: "busy",        label: "Busy" },
  { value: "switchedoff", label: "Switched Off" },
  { value: "wrongnumber", label: "Wrong Number" },
  { value: "callback",    label: "Call Back Later" },
] as const;
export type CallResult = (typeof CALL_RESULTS)[number]["value"];

export const CALL_RESULT_LABELS: Record<string, string> =
  Object.fromEntries(CALL_RESULTS.map((r) => [r.value, r.label]));

/** A call that has been dialled but not yet written up. */
export interface PendingOutcome extends CallSession {
  callStartedAt?: string | null;
  outcomeStatus?: "pending" | "submitted" | "skipped" | null;
  callResult?: CallResult | null;
  callDurationSeconds?: number;
  callNote?: string;
}

export interface MySessionState {
  onShift: boolean;
  mode?: "off" | "full" | "half";
  breakEndsAt: string | null;
  session: CallSession | null;
  /** Set while call details are owed — the popup reopens for it. */
  pendingOutcome?: PendingOutcome | null;
  /** Set once a break has run out and they have not confirmed they are back. */
  breakReturn?: BreakReturnState | null;
}

export interface BreakReturnState {
  _id: string;
  breakEndsAt: string | null;
  breakReturnPromptedAt: string | null;
  breakExtensions: number;
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

/** Save (or edit) the call write-up. Every save is kept in the session history. */
export function useSubmitCallOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { sessionId: string; callResult: CallResult; durationSeconds: number; note: string }) => {
      const { sessionId, ...body } = vars;
      const res = await api.post(`/call-automation/sessions/${sessionId}/outcome`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Call details saved");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Could not save the call details");
    },
  });
}

/** The way out of the mandatory form — costs a reason, and admins see it. */
export function useSkipCallOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      const res = await api.post(`/call-automation/sessions/${sessionId}/outcome/skip`, { reason });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.message("Recorded as not filled in");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Could not record that");
    },
  });
}

/** "I'm back" once the break has run out. */
export function useConfirmBreakReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/call-automation/break/return")).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Welcome back"); },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Could not record that");
    },
  });
}

/** Push the break out instead of claiming to be back. */
export function useExtendBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ minutes }: { minutes: number }) =>
      (await api.post("/call-automation/break/extend", { minutes })).data,
    onSuccess: (d: { message?: string }) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.message(d?.message ?? "Break extended");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Could not extend the break");
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

// ── Admin overview (Super Admin only) ─────────────────────────────────────────

export interface CallOverviewUserRef { _id: string; name: string; email?: string }
export interface CallOverviewRow {
  _id: string;
  user: CallOverviewUserRef;
  lead?: { _id: string; name: string; phone?: string; status?: string } | null;
  promptedAt: string;
  respondedAt?: string | null;
  action?: string | null;
  rejectReason?: string;
  holdSeconds?: number;
  breakMinutes?: number;
  breakEndsAt?: string | null;

  // Call write-up
  callStartedAt?: string | null;
  outcomeStatus?: "pending" | "submitted" | "skipped" | null;
  callResult?: CallResult | null;
  callDurationSeconds?: number;
  callNote?: string;
  outcomeAt?: string | null;
  outcomeSkipReason?: string;
  outcomeHistory?: CallOutcomeEntry[];

  // Break return
  breakReturnPromptedAt?: string | null;
  breakReturnedAt?: string | null;
  breakReturnHoldSeconds?: number;
  breakOverrunSeconds?: number;
  breakReturnClosedAt?: string | null;
  breakExtensions?: number;
}

/** One filling-in of a call's details. Edits append, so this is the full trail. */
export interface CallOutcomeEntry {
  callResult: CallResult;
  durationSeconds: number;
  note: string;
  recordedAt: string;
  recordedBy?: { _id: string; name?: string } | string | null;
}
export interface CallOverviewPerUser {
  _id: string; name?: string;
  total: number; called: number; updated: number; rejected: number; breaks: number; expired: number;
  avgHold?: number | null; maxHold?: number | null;
}
export interface CallOverview {
  counts: Record<string, number>;
  rejections: CallOverviewRow[];
  flaggedHolds: CallOverviewRow[];
  activeBreaks: CallOverviewRow[];
  perUser: CallOverviewPerUser[];
  /** Every dialled call in the period, newest first. */
  callLog: CallOverviewRow[];
  outcomeCounts: Record<string, number>;
  pendingOutcomes: CallOverviewRow[];
  skippedOutcomes: CallOverviewRow[];
  /** Every break in the period, and how it ended. */
  breakLog: CallOverviewRow[];
  awaitingReturn: CallOverviewRow[];
  unconfirmedReturns: CallOverviewRow[];
}

export function useCallOverview(filters: { dateFrom?: string; dateTo?: string; userId?: string } = {}) {
  const qc = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();

  const query = useQuery<CallOverview>({
    queryKey: ["call-automation", "overview", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo)   params.set("dateTo", filters.dateTo);
      if (filters.userId)   params.set("userId", filters.userId);
      const res = await api.get<ApiResponse<CallOverview>>(`/call-automation/overview?${params}`);
      return res.data.data!;
    },
    enabled: isAuthenticated,
    // Breaks tick down and holds grow, so keep the page close to live.
    refetchInterval: 30_000,
  });

  // A prompt anywhere in the system changes what this page shows.
  useEffect(() => {
    if (!accessToken || !isAuthenticated) return;
    const socket = getSocket(accessToken);
    const refresh = () => qc.invalidateQueries({ queryKey: ["call-automation", "overview"] });
    socket.on("call:prompt", refresh);
    socket.on("call:activity", refresh);
    return () => { socket.off("call:prompt", refresh); socket.off("call:activity", refresh); };
  }, [accessToken, isAuthenticated, qc]);

  return query;
}
