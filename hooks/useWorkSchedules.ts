"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse, User, WorkSchedule } from "@/types";

const KEY = ["work-schedules"] as const;

export type WorkScheduleInput = Omit<WorkSchedule, "_id" | "assignedCount" | "isActive"> &
  Partial<Pick<WorkSchedule, "isActive">>;

/** Surfaces the server's own message — it explains WHY a save was refused. */
function fail(fallback: string) {
  return (err: unknown) => {
    const e = err as { response?: { data?: { message?: string } } };
    toast.error(e.response?.data?.message ?? fallback);
  };
}

export const useWorkSchedules = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<ApiResponse<WorkSchedule[]>>("/work-schedules");
      return res.data.data ?? [];
    },
  });

export const useCreateWorkSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: WorkScheduleInput) => {
      const res = await api.post<ApiResponse<WorkSchedule>>("/work-schedules", data);
      return res.data.data!;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Schedule created"); },
    onError: fail("Failed to create schedule"),
  });
};

export const useUpdateWorkSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WorkScheduleInput }) => {
      const res = await api.put<ApiResponse<WorkSchedule>>(`/work-schedules/${id}`, data);
      return res.data.data!;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Schedule updated"); },
    onError: fail("Failed to update schedule"),
  });
};

export const useDeleteWorkSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/work-schedules/${id}`);
      return id;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Schedule deleted"); },
    onError: fail("Failed to delete schedule"),
  });
};

/** Assign a schedule to a user, or pass null to clear it. */
export const useAssignWorkSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, scheduleId }: { userId: string; scheduleId: string | null }) => {
      const res = await api.put<ApiResponse<User>>(`/users/${userId}/work-schedule`, { scheduleId });
      return res.data.data!;
    },
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: KEY });          // assignedCount changes
      toast.success(user.workSchedule ? "Schedule assigned" : "Schedule removed");
    },
    onError: fail("Failed to assign schedule"),
  });
};
