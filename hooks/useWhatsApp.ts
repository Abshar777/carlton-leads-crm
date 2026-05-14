"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WAStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

export interface WAStatusData {
  status:   WAStatus;
  phone?:   string;
  qrImage?: string;
}

export interface WAMessage {
  _id:        string;
  lead:       string | null;
  phone:      string;
  direction:  "inbound" | "outbound";
  body:       string;
  messageId:  string;
  senderName: string;
  agentId?:   { _id: string; name: string } | null;
  read:       boolean;
  createdAt:  string;
  mediaData?: string | null;   // base64
  mediaType?: "image" | "video" | "document" | "audio" | "sticker" | null;
  mimeType?:  string | null;
  fileName?:  string | null;
}

export interface WAChat {
  phone:      string;
  senderName: string;
  lastBody:   string;
  lastAt:     string;
  lastDir:    "inbound" | "outbound";
  unread:     number;
  lead:       { _id: string; name: string; phone: string } | null;
}

export interface WASettings {
  _id:             string;
  userId:          string;
  autoCreateLeads: boolean;
}

// ── Unknown contact event (from socket) ───────────────────────────────────────
export interface WAUnknownContact {
  phone:      string;
  senderName: string;
  body:       string;
  messageId:  string;
  timestamp:  string;
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export const WA_STATUS_KEY   = ["whatsapp", "status"]   as const;
export const WA_UNREAD_KEY   = ["whatsapp", "unread"]   as const;
export const WA_CHATS_KEY    = ["whatsapp", "chats"]    as const;
export const WA_SETTINGS_KEY = ["whatsapp", "settings"] as const;

export const waMessagesKey      = (phone: string) => ["whatsapp", "messages", phone]       as const;
export const waPortalMsgsKey    = (phone: string) => ["whatsapp", "portal-messages", phone] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

// ── Status & connection ───────────────────────────────────────────────────────

export const useWAStatus = () =>
  useQuery({
    queryKey: WA_STATUS_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<WAStatusData>>("/whatsapp/status");
      return res.data.data!;
    },
    refetchInterval: 5_000,
  });

export const useWAUnreadCount = () =>
  useQuery({
    queryKey: WA_UNREAD_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ count: number }>>("/whatsapp/unread-count");
      return res.data.data?.count ?? 0;
    },
    refetchInterval: 10_000,
  });

export const useConnectWA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post("/whatsapp/connect"),
    onSuccess: () => {
      toast.info("Connecting — scan the QR code with your WhatsApp");
      qc.invalidateQueries({ queryKey: WA_STATUS_KEY });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to connect")),
  });
};

export const useDisconnectWA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post("/whatsapp/disconnect"),
    onSuccess: () => {
      toast.success("WhatsApp disconnected");
      qc.invalidateQueries({ queryKey: WA_STATUS_KEY });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to disconnect")),
  });
};

// ── Portal: chat list ─────────────────────────────────────────────────────────

export const useWAChats = () =>
  useQuery({
    queryKey: WA_CHATS_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<WAChat[]>>("/whatsapp/chats");
      return res.data.data ?? [];
    },
    refetchInterval: 15_000,
  });

// ── Portal: messages ──────────────────────────────────────────────────────────

export const usePortalMessages = (phone: string) =>
  useQuery({
    queryKey: waPortalMsgsKey(phone),
    queryFn: async () => {
      const res = await api.get<ApiResponse<WAMessage[]>>(`/whatsapp/chats/${phone}/messages`);
      return res.data.data ?? [];
    },
    enabled: !!phone,
  });

export const useMarkChatRead = (phone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.patch(`/whatsapp/chats/${phone}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WA_CHATS_KEY });
      qc.invalidateQueries({ queryKey: WA_UNREAD_KEY });
    },
  });
};

export const useAssignLeadToChat = (phone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) =>
      api.post(`/whatsapp/chats/${phone}/assign`, { leadId }),
    onSuccess: () => {
      toast.success("Lead assigned to chat");
      qc.invalidateQueries({ queryKey: WA_CHATS_KEY });
      qc.invalidateQueries({ queryKey: waPortalMsgsKey(phone) });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to assign lead")),
  });
};

export interface CreateLeadFromChatInput {
  name?:   string;
  email?:  string;
  status?: string;
}

export const useCreateLeadFromChat = (phone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: CreateLeadFromChatInput) =>
      api.post(`/whatsapp/chats/${phone}/create-lead`, data ?? {}),
    onSuccess: () => {
      toast.success("Lead created");
      qc.invalidateQueries({ queryKey: WA_CHATS_KEY });
      qc.invalidateQueries({ queryKey: waPortalMsgsKey(phone) });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to create lead")),
  });
};

// ── Settings ──────────────────────────────────────────────────────────────────

export const useWASettings = () =>
  useQuery({
    queryKey: WA_SETTINGS_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<WASettings>>("/whatsapp/settings");
      return res.data.data!;
    },
  });

export const useUpdateWASettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<WASettings>) =>
      api.put("/whatsapp/settings", data),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: WA_SETTINGS_KEY });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to save settings")),
  });
};

// ── Legacy: per-lead messages (used by lead detail page) ─────────────────────

export const useWAMessages = (phone: string) =>
  useQuery({
    queryKey: waMessagesKey(phone),
    queryFn: async () => {
      const res = await api.get<ApiResponse<WAMessage[]>>(`/whatsapp/messages/${phone}`);
      return res.data.data ?? [];
    },
    enabled: !!phone,
  });

export const useSendWAMessage = (phone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) =>
      api.post("/whatsapp/send", { phone, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: waMessagesKey(phone) });
      qc.invalidateQueries({ queryKey: waPortalMsgsKey(phone) });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to send message")),
  });
};

export const useMarkWARead = (phone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.patch(`/whatsapp/messages/${phone}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WA_UNREAD_KEY });
      qc.invalidateQueries({ queryKey: waMessagesKey(phone) });
    },
  });
};

export const useSendMedia = (phone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      const form = new FormData();
      form.append("file", file);
      if (caption) form.append("caption", caption);
      // Do NOT set Content-Type manually — browser adds the boundary automatically
      return api.post(`/whatsapp/chats/${phone}/send-media`, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: waPortalMsgsKey(phone) });
      qc.invalidateQueries({ queryKey: WA_CHATS_KEY });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to send media")),
  });
};
