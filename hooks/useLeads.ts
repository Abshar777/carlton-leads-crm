"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";
import type { Lead, LeadFilters, LeadStats, UploadLeadsResult, AutoAssignResult } from "@/types/lead";
import type { CreateLeadFormValues, UpdateLeadFormValues } from "@/lib/validations/leadSchema";

const LEADS_KEY = ["leads"] as const;

// ─── Helper ───────────────────────────────────────────────────────────────────
function errMsg(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const useLeads = (filters?: LeadFilters) => {
  return useQuery({
    queryKey: [...LEADS_KEY, filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.page)       params.page       = String(filters.page);
      if (filters?.limit)      params.limit      = String(filters.limit);
      if (filters?.status)     params.status     = filters.status;
      if (filters?.assignedTo) params.assignedTo = filters.assignedTo;
      if (filters?.team)       params.team       = filters.team;
      if (filters?.reporter)   params.reporter   = filters.reporter;
      if (filters?.search)     params.search     = filters.search;
      if (filters?.course)     params.course     = filters.course;
      if (filters?.dateFrom)   params.dateFrom   = filters.dateFrom;
      if (filters?.dateTo)     params.dateTo     = filters.dateTo;
      const response = await api.get<ApiResponse<Lead[]>>("/leads", { params });
      return { data: response.data.data ?? [], pagination: response.data.pagination };
    },
  });
};

/** Full detail — includes notes[] and activityLogs[] populated */
export const useLead = (id: string) => {
  return useQuery({
    queryKey: [...LEADS_KEY, id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Lead>>(`/leads/${id}`);
      return response.data.data!;
    },
    enabled: !!id,
  });
};

export const useUserLeads = (userId: string, filters?: LeadFilters) => {
  return useQuery({
    queryKey: [...LEADS_KEY, "user", userId, filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.page)     params.page     = String(filters.page);
      if (filters?.limit)    params.limit    = String(filters.limit);
      if (filters?.status)   params.status   = filters.status;
      if (filters?.search)   params.search   = filters.search;
      if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters?.dateTo)   params.dateTo   = filters.dateTo;
      const response = await api.get<ApiResponse<Lead[]>>(`/users/${userId}/leads`, { params });
      return { data: response.data.data ?? [], pagination: response.data.pagination };
    },
    enabled: !!userId,
  });
};

export const useUserLeadStats = (userId: string) => {
  return useQuery({
    queryKey: [...LEADS_KEY, "stats", userId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<LeadStats>>(`/users/${userId}/lead-stats`);
      return response.data.data!;
    },
    enabled: !!userId,
  });
};

// ─── Lead Mutations ───────────────────────────────────────────────────────────

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLeadFormValues) => {
      const response = await api.post<ApiResponse<Lead>>("/leads", data);
      return response.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      toast.success("Lead created successfully");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to create lead")),
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLeadFormValues }) => {
      const response = await api.put<ApiResponse<Lead>>(`/leads/${id}`, data);
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Lead updated successfully");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to update lead")),
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Lead["status"] }) => {
      const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}/status`, { status });
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Status updated");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to update status")),
  });
};

export const useAssignLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}/assign`, { userId });
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.id] });
      toast.success("Lead assigned successfully");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to assign lead")),
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/leads/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      toast.success("Lead deleted successfully");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to delete lead")),
  });
};

export const useUploadLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, teamIds }: { file: File; teamIds?: string[] }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (teamIds !== undefined) {
        formData.append("teamIds", JSON.stringify(teamIds));
      }
      const response = await api.post<ApiResponse<UploadLeadsResult>>("/leads/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      toast.success(`Upload complete: ${data.created} leads created`);
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to upload leads")),
  });
};

export const useAutoAssignLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadIds?: string[]) => {
      const response = await api.post<ApiResponse<AutoAssignResult>>("/leads/auto-assign", { leadIds });
      return response.data.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      toast.success(`Auto-assigned ${data.assigned} leads`);
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to auto-assign leads")),
  });
};

// ─── Team Assignment Mutations ────────────────────────────────────────────────

export const useAssignLeadToTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}/team`, { teamId });
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Lead assigned to team");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to assign to team")),
  });
};

export const useTransferLeadToTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}/transfer`, { teamId });
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Lead transferred to new team");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to transfer lead")),
  });
};

// ─── Bulk Mutations ───────────────────────────────────────────────────────────

export const useBulkUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadIds, status }: { leadIds: string[]; status: string }) => {
      const res = await api.patch<ApiResponse<{ updated: number }>>("/leads/bulk/status", { leadIds, status });
      return res.data.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(`${data.updated} lead(s) status updated`);
    },
    onError: (err: unknown) => toast.error(errMsg(err, "Failed to update status")),
  });
};

export const useBulkDeleteLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      const res = await api.delete<ApiResponse<{ deleted: number }>>("/leads/bulk", { data: { leadIds } });
      return res.data.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(`${data.deleted} lead(s) deleted`);
    },
    onError: (err: unknown) => toast.error(errMsg(err, "Failed to delete leads")),
  });
};

export const useBulkAssignLeadsToTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadIds, teamId }: { leadIds: string[]; teamId: string }) => {
      const res = await api.patch<ApiResponse<{ updated: number }>>("/leads/bulk/team", { leadIds, teamId });
      return res.data.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(`${data.updated} lead(s) assigned to team`);
    },
    onError: (err: unknown) => toast.error(errMsg(err, "Failed to assign leads to team")),
  });
};

// ─── Note Mutations ───────────────────────────────────────────────────────────

export const useAddLeadNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const response = await api.post<ApiResponse<Lead>>(`/leads/${leadId}/notes`, { content });
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.leadId] });
      toast.success("Note added");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to add note")),
  });
};

export const useUpdateLeadNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, noteId, content }: { leadId: string; noteId: string; content: string }) => {
      const response = await api.put<ApiResponse<Lead>>(`/leads/${leadId}/notes/${noteId}`, { content });
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.leadId] });
      toast.success("Note updated");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to update note")),
  });
};

export const useDeleteLeadNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, noteId }: { leadId: string; noteId: string }) => {
      await api.delete(`/leads/${leadId}/notes/${noteId}`);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY });
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.leadId] });
      toast.success("Note deleted");
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to delete note")),
  });
};

// ─── Call Not Connected ───────────────────────────────────────────────────────

export const useUpdateCallNotConnected = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, action }: { leadId: string; action: "increment" | "decrement" }) => {
      const response = await api.patch<ApiResponse<{ callNotConnected: number }>>(
        `/leads/${leadId}/call-not-connected`,
        { action },
      );
      return response.data.data!;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, vars.leadId] });
    },
    onError: (error: unknown) => toast.error(errMsg(error, "Failed to update call count")),
  });
};
