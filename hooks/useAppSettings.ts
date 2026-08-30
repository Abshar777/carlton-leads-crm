"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface AppSettings {
  workflowEnabled: boolean;
}

const KEY = ["app-settings"] as const;

export const useAppSettings = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<AppSettings>>("/settings/app");
      return res.data.data!;
    },
  });

export const useUpdateAppSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AppSettings>) => {
      const res = await api.patch<ApiResponse<AppSettings>>("/settings/app", data);
      return res.data.data!;
    },
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });
};
