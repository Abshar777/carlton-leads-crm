"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock, Plus, Pencil, Trash2, Save, X, Loader2,
  Users as UsersIcon, Search, ChevronDown, Check, AlertTriangle,
} from "lucide-react";
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
  useScheduleMembers, useSetScheduleMembers,
  type WorkScheduleInput,
} from "@/hooks/useWorkSchedules";
import { useUsers } from "@/hooks/useUsers";
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

/**
 * Who this schedule prompts. Only users listed here get the auto-call popup —
 * a user with no schedule is skipped by the prompt scheduler entirely.
 */
function MembersPanel({ schedule }: { schedule: WorkSchedule }) {
  const { data: members = [], isLoading } = useScheduleMembers(schedule._id);
  const { data: usersData } = useUsers({ limit: "200" });
  const { mutate: setMembers, isPending } = useSetScheduleMembers();

  const [search, setSearch] = useState("");
  // Local working copy — nothing is written until Save is pressed
  const [selected, setSelected] = useState<string[] | null>(null);
  const current = selected ?? members.map((m) => m._id);

  const allUsers = usersData?.data ?? [];
  const filtered = allUsers.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const dirty =
    selected !== null &&
    (selected.length !== members.length || selected.some((id) => !members.some((m) => m._id === id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const base = prev ?? members.map((m) => m._id);
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });

  /** The name of the OTHER schedule this user is on, if any — picking them moves them. */
  const otherSchedule = (u: { workSchedule?: unknown }) => {
    const ws = u.workSchedule as { _id?: string; name?: string } | string | null | undefined;
    if (!ws || typeof ws === "string") return null;
    return ws._id && ws._id !== schedule._id ? ws.name ?? null : null;
  };

  const movingCount = current.filter((id) => {
    const u = allUsers.find((x) => x._id === id);
    return u ? !!otherSchedule(u) : false;
  }).length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-3 space-y-3 border-t border-border pt-3">
        {/* Currently on this schedule */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            On this schedule ({current.length})
          </p>
          {isLoading ? (
            <div className="h-7 w-40 animate-pulse rounded bg-muted/40" />
          ) : current.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nobody yet — these users will not get call prompts.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {current.map((id) => {
                const u = allUsers.find((x) => x._id === id) ?? members.find((m) => m._id === id);
                return (
                  <motion.span
                    key={id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
                  >
                    {u?.name ?? "Unknown"}
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className="rounded-full p-0.5 hover:bg-primary/20"
                      aria-label={`Remove ${u?.name ?? "user"}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                );
              })}
            </div>
          )}
        </div>

        {/* Picker */}
        <div>
          <div className="relative mb-1.5">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users to add…"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
            {filtered.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No users match.</p>
            ) : (
              filtered.map((u) => {
                const on = current.includes(u._id);
                const moving = otherSchedule(u);
                return (
                  <button
                    type="button"
                    key={u._id}
                    onClick={() => toggle(u._id)}
                    className={`flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left last:border-0 transition-colors hover:bg-muted/50 ${
                      on ? "bg-primary/5" : ""
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{u.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{u.email}</span>
                    </span>
                    {moving && (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                        on {moving}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {movingCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {movingCount} selected user{movingCount === 1 ? " is" : "s are"} on another schedule.
              Saving moves {movingCount === 1 ? "them" : "them"} here — a user can only be on one schedule.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8"
            disabled={!dirty || isPending}
            onClick={() =>
              setMembers(
                { scheduleId: schedule._id, userIds: current },
                { onSuccess: () => setSelected(null) },
              )
            }
          >
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save members
          </Button>
          {dirty && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelected(null)}>
              Reset
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function WorkSchedulesTab() {
  const { data: schedules = [], isLoading } = useWorkSchedules();
  const { mutate: create, isPending: creating } = useCreateWorkSchedule();
  const { mutate: update, isPending: updating } = useUpdateWorkSchedule();
  const { mutate: remove, isPending: deleting } = useDeleteWorkSchedule();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkScheduleInput>(blank());
  const [confirmDelete, setConfirmDelete] = useState<WorkSchedule | null>(null);
  const [membersOpen, setMembersOpen] = useState<string | null>(null);

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
          <p className="text-xs text-muted-foreground mt-1">Create one, then add members to it here.</p>
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
                    <button
                      type="button"
                      onClick={() => setMembersOpen((cur) => (cur === s._id ? null : s._id))}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                        membersOpen === s._id
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      <UsersIcon className="h-3 w-3" />
                      {s.assignedCount ?? 0} member{(s.assignedCount ?? 0) === 1 ? "" : "s"}
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${membersOpen === s._id ? "rotate-180" : ""}`}
                      />
                    </button>
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

              <AnimatePresence initial={false}>
                {membersOpen === s._id && <MembersPanel key={`m-${s._id}`} schedule={s} />}
              </AnimatePresence>
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
