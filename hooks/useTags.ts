"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import type { Tag } from "@/types/tag";

const TAGS_KEY = ["tags"] as const;

function errMsg(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const r = (error as { response?: { data?: { message?: string } } }).response;
    return r?.data?.message ?? fallback;
  }
  return fallback;
}

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: TAGS_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: Tag[] }>("/tags");
      return res.data.data ?? [];
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post<{ data: Tag }>("/tags", data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      toast.success("Tag created");
    },
    onError: (error) => toast.error(errMsg(error, "Failed to create tag")),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      api.put<{ data: Tag }>(`/tags/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Tag updated");
    },
    onError: (error) => toast.error(errMsg(error, "Failed to update tag")),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Tag deleted");
    },
    onError: (error) => toast.error(errMsg(error, "Failed to delete tag")),
  });
}

export function useUpdateLeadTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, tagIds }: { leadId: string; tagIds: string[] }) =>
      api.put(`/leads/${leadId}/tags`, { tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error) => toast.error(errMsg(error, "Failed to update tags")),
  });
}
