"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManifestCollection {
  name:    string;
  count:   number;
  fileId:  string;
}

export interface ManifestEntry {
  id:           string;
  timestamp:    string;
  timestampIST: string;
  totalRecords: number;
  collections:  ManifestCollection[];
}

export interface BackupManifest {
  backups: ManifestEntry[];
}

export interface RestoreResult {
  name:   string;
  count:  number;
  status: "ok" | "failed";
  error?: string;
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const BACKUP_KEY = ["backup", "manifest"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errMsg(e: unknown, fallback: string) {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useBackupManifest = () =>
  useQuery({
    queryKey: BACKUP_KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<BackupManifest>>("/backup/manifest");
      return res.data.data ?? { backups: [] };
    },
  });

export const useTriggerBackup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ started: boolean }>>("/backup/run");
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Backup started — files will appear in Telegram shortly");
      setTimeout(() => qc.invalidateQueries({ queryKey: BACKUP_KEY }), 5000);
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Failed to start backup")),
  });
};

export const useRestoreBackup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (backupId: string) => {
      const res = await api.post<ApiResponse<RestoreResult[]>>("/backup/restore", { backupId });
      return res.data.data ?? [];
    },
    onSuccess: (results) => {
      const failed = results.filter((r) => r.status === "failed").length;
      if (failed > 0) {
        toast.warning(`Restore complete — ${failed} collection(s) failed`);
      } else {
        toast.success(`Restore complete — ${results.length} collections restored`);
      }
      qc.invalidateQueries({ queryKey: BACKUP_KEY });
    },
    onError: (e: unknown) => toast.error(errMsg(e, "Restore failed")),
  });
};
