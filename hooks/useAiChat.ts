"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";

// ── Model info ────────────────────────────────────────────────────────────────

export interface AiModelInfo {
  activeProvider: string;
  ollama: {
    available:   boolean;
    baseUrl:     string;
    activeModel: string;
    models:      string[];
  };
  gemini: {
    available: boolean;
    model:     string;
  };
}

export const useAiModels = () =>
  useQuery({
    queryKey: ["ai-models"],
    queryFn:  async () => {
      const res = await api.get<ApiResponse<AiModelInfo>>("/ai/models");
      return res.data.data!;
    },
    staleTime: 30_000,
  });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiMessage {
  role:      "user" | "assistant";
  content:   string;
  createdAt: string;
}

export interface AiSession {
  sessionId:     string;
  sessionName:   string;
  contextType:   AiContextType;
  contextId:     string;
  messageCount:  number;
  lastMessageAt: string | null;
  lastPreview:   string | null;
  updatedAt:     string;
}

export type AiContextType = "lead" | "team" | "report";

// ── Query keys ────────────────────────────────────────────────────────────────

export const AI_SESSIONS_KEY = (contextType?: string) =>
  ["ai-sessions", contextType ?? "all"] as const;

export const aiSessionMessagesKey = (sessionId: string | null) =>
  ["ai-session-messages", sessionId] as const;

function legacyAiKey(contextType: AiContextType, contextId: string) {
  return ["ai-memory", contextType, contextId] as const;
}

function legacyChatUrl(contextType: AiContextType, contextId: string) {
  if (contextType === "report") return "/ai/chat/report";
  return `/ai/chat/${contextType}/${contextId}`;
}

// ── Session hooks ─────────────────────────────────────────────────────────────

export const useAiSessions = (contextType?: AiContextType, contextId?: string) =>
  useQuery({
    queryKey: AI_SESSIONS_KEY(contextType),
    queryFn:  async () => {
      const params: Record<string, string> = {};
      if (contextType) params.contextType = contextType;
      if (contextId)   params.contextId   = contextId;
      const res = await api.get<ApiResponse<AiSession[]>>("/ai/sessions", { params });
      return res.data.data ?? [];
    },
  });

export const useAiSessionMessages = (sessionId: string | null) =>
  useQuery({
    queryKey: aiSessionMessagesKey(sessionId),
    queryFn:  async () => {
      const res = await api.get<ApiResponse<{ messages: AiMessage[]; sessionName: string }>>(
        `/ai/sessions/${sessionId}/messages`
      );
      return res.data.data ?? { messages: [], sessionName: "New Chat" };
    },
    enabled: !!sessionId,
  });

export const useCreateAiSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params?: { contextType?: AiContextType; contextId?: string; sessionName?: string }) =>
      (await api.post<ApiResponse<AiSession>>("/ai/sessions", params ?? {})).data.data!,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY() });
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY("report") });
    },
    onError: () => toast.error("Failed to create session"),
  });
};

export const useRenameAiSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, sessionName }: { sessionId: string; sessionName: string }) =>
      api.patch(`/ai/sessions/${sessionId}`, { sessionName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY() });
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY("report") });
    },
    onError: () => toast.error("Failed to rename session"),
  });
};

export const useDeleteAiSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => api.delete(`/ai/sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY() });
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY("report") });
    },
    onError: () => toast.error("Failed to delete session"),
  });
};

export const useAiChatWithSession = (sessionId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post<ApiResponse<{
        reply:       string;
        provider:    string;
        messages:    AiMessage[];
        sessionId:   string;
        sessionName: string;
      }>>(`/ai/chat/session/${sessionId}`, { message });
      return res.data.data!;
    },
    onSuccess: (data) => {
      qc.setQueryData(aiSessionMessagesKey(sessionId), {
        messages:    data.messages,
        sessionName: data.sessionName,
      });
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY("report") });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "AI request failed";
      toast.error(msg);
    },
  });
};

// ── Legacy hooks (lead / team AI chat panels) ─────────────────────────────────

export const useAiMemory = (contextType: AiContextType, contextId: string) =>
  useQuery({
    queryKey: legacyAiKey(contextType, contextId),
    queryFn:  async () => {
      const res = await api.get<ApiResponse<{ messages: AiMessage[] }>>(
        `/ai/memory/${contextType}/${contextId}`
      );
      return res.data.data?.messages ?? [];
    },
    enabled: !!contextId,
  });

export const useAiChat = (contextType: AiContextType, contextId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post<ApiResponse<{ reply: string; messages: AiMessage[] }>>(
        legacyChatUrl(contextType, contextId),
        { message }
      );
      return res.data.data!;
    },
    onSuccess: (data) => {
      qc.setQueryData(legacyAiKey(contextType, contextId), data.messages);
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "AI request failed";
      toast.error(msg);
    },
  });
};

export const useClearAiMemory = (contextType: AiContextType, contextId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.delete(`/ai/memory/${contextType}/${contextId}`),
    onSuccess: () => {
      qc.setQueryData(legacyAiKey(contextType, contextId), []);
      toast.success("Conversation cleared");
    },
    onError: () => toast.error("Failed to clear conversation"),
  });
};
