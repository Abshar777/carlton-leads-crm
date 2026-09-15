"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Plus, Pencil, Trash2, Save, X, Loader2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useWorkSchedules, useCreateWorkSchedule, useUpdateWorkSchedule, useDeleteWorkSchedule,
  type WorkScheduleInput,
} from "@/hooks/useWorkSchedules";
import { DAY_KEYS, DAY_LABELS, type DayKey, type DayMode, type WorkSchedule } from "@/types";

const NEXT_MODE: Record<DayMode, DayMode> = { off: "full", full: "half", half: "off" };

const MODE_STYLE: Record<DayMode, string> = {
  full: "bg-primary text-primary-foreground border-primary",
  half: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  off:  "bg-muted/40 text-muted-foreground/60 border-border",
};

const blank = (): WorkScheduleInput => ({
  name: "", description: "",
  loginTime: "09:00", logoutTime: "18:00",
  breakStart: "", breakEnd: "", halfDayLogoutTime: "",
  graceMinutes: 0,
  workDays: DAY_KEYS.reduce((a, d) => ({ ...a, [d]: d === "sun" ? "off" : "full" }), {} as Record<DayKey, DayMode>),
});

export function WorkSchedulesTab() {
  const { data: schedules = [], isLoading } = useWorkSchedules();
  const { mutate: create, isPending: creating } = useCreateWorkSchedule();
  const { mutate: update, isPending: updating } = useUpdateWorkSchedule();
  const { mutate: remove, isPending: deleting } = useDeleteWorkSchedule();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkScheduleInput>(blank());
  const [confirmDelete, setConfirmDelete] = useState<WorkSchedule | null>(null);

  const isPending = creating || updating;
  const set = <K extends keyof WorkScheduleInput>(k: K, v: WorkScheduleInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const openNew = () => { setDraft(blank()); setEditingId("new"); };
  const openEdit = (s: WorkSchedule) => {
    setDraft({
      name: s.name, description: s.description ?? "",
      loginTime: s.loginTime, logoutTime: s.logoutTime,
      breakStart: s.breakStart ?? "", breakEnd: s.breakEnd ?? "",
      halfDayLogoutTime: s.halfDayLogoutTime ?? "",
      graceMinutes: s.graceMinutes ?? 0,
      workDays: { ...s.workDays },
    });
    setEditingId(s._id);
  };

  const cycleDay = (d: DayKey) =>
    setDraft((prev) => ({ ...prev, workDays: { ...prev.workDays, [d]: NEXT_MODE[prev.workDays[d] ?? "off"] } }));

  const save = () => {
    // Empty optional times go as undefined, not "", or the server's HH:mm check rejects them
    const payload: WorkScheduleInput = {
      ...draft,
      breakStart: draft.breakStart || undefined,
      breakEnd: draft.breakEnd || undefined,
      halfDayLogoutTime: draft.halfDayLogoutTime || undefined,
      description: draft.description || undefined,
    };
    const done = { onSuccess: () => setEditingId(null) };
    if (editingId === "new") create(payload, done);
    else if (editingId) update({ id: editingId, data: payload }, done);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" /> Work Schedules
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reusable shifts you can assign to users. Times are IST.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" /> New Schedule
        </Button>
      </div>

      <AnimatePresence>
        {editingId && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="border-primary/30">
              <CardContent className="space-y-4 pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Schedule Name *</Label>
                    <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="General Shift" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Grace (minutes)</Label>
                    <Input type="number" min={0} max={240} value={draft.graceMinutes ?? 0} onChange={(e) => set("graceMinutes", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Login Time *</Label>
                    <Input type="time" value={draft.loginTime} onChange={(e) => set("loginTime", e.target.value)} className="[color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Logout Time *</Label>
                    <Input type="time" value={draft.logoutTime} onChange={(e) => set("logoutTime", e.target.value)} className="[color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Break From</Label>
                    <Input type="time" value={draft.breakStart ?? ""} onChange={(e) => set("breakStart", e.target.value)} className="[color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Break To</Label>
                    <Input type="time" value={draft.breakEnd ?? ""} onChange={(e) => set("breakEnd", e.target.value)} className="[color-scheme:dark]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex flex-wrap items-center gap-2">
                    Work Days
                    <span className="text-xs font-normal text-muted-foreground">(tap to cycle: off &rarr; full &rarr; half)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_KEYS.map((d) => {
                      const mode = draft.workDays[d] ?? "off";
                      return (
                        <motion.button key={d} type="button" whileTap={{ scale: 0.94 }} onClick={() => cycleDay(d)}
                          className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 transition-colors ${MODE_STYLE[mode]}`}>
                          <span className="text-sm font-semibold">{DAY_LABELS[d]}</span>
                          <span className="text-[10px] uppercase tracking-wide opacity-80">{mode}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {DAY_KEYS.some((d) => draft.workDays[d] === "half") && (
                  <div className="space-y-1.5 max-w-xs">
                    <Label>Half-day Logout Time *</Label>
                    <Input type="time" value={draft.halfDayLogoutTime ?? ""} onChange={(e) => set("halfDayLogoutTime", e.target.value)} className="[color-scheme:dark]" />
                    <p className="text-xs text-muted-foreground">Half days end here instead of the usual logout time.</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={2} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Standard day shift" />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={save} disabled={isPending || !draft.name.trim()}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingId === "new" ? "Create" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No schedules yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create one, then assign it from a user&apos;s page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s, i) => (
            <motion.div key={s._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.loginTime}&ndash;{s.logoutTime}
                      {s.breakStart && s.breakEnd ? ` · break ${s.breakStart}-${s.breakEnd}` : ""}
                      {s.graceMinutes > 0 ? ` · ${s.graceMinutes} min grace` : ""}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      <UsersIcon className="h-3 w-3" />{s.assignedCount ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {DAY_KEYS.map((d) => (
                      <span key={d} className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${MODE_STYLE[s.workDays?.[d] ?? "off"]}`}>
                        {DAY_LABELS[d]}
                      </span>
                    ))}
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              {(confirmDelete?.assignedCount ?? 0) > 0
                ? `"${confirmDelete?.name}" is assigned to ${confirmDelete?.assignedCount} user(s). Reassign them first — the delete will be refused.`
                : `"${confirmDelete?.name}" will be removed. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}
              onClick={() => { if (confirmDelete) remove(confirmDelete._id, { onSuccess: () => setConfirmDelete(null) }); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
