"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Copy, Save, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateWorkSchedule } from "@/hooks/useUsers";
import { WORK_DAYS, WORK_DAY_LABELS, type WorkDay, type WorkDayKey, type WorkSchedule } from "@/types";

const BLANK_DAY: WorkDay = { enabled: false, loginTime: "", breakStart: "", breakEnd: "", logoutTime: "" };
const blankSchedule = (): WorkSchedule =>
  WORK_DAYS.reduce((acc, d) => ({ ...acc, [d]: { ...BLANK_DAY } }), {} as WorkSchedule);

interface Props {
  userId: string;
  userName: string;
  schedule?: WorkSchedule | null;
  /** Super Admin gets the editor; everyone else sees it read-only. */
  canEdit: boolean;
}

export function WorkScheduleCard({ userId, userName, schedule, canEdit }: Props) {
  const [draft, setDraft] = useState<WorkSchedule>(() => ({ ...blankSchedule(), ...(schedule ?? {}) }));
  const [dirty, setDirty] = useState(false);
  const { mutate: save, isPending } = useUpdateWorkSchedule();

  // Re-sync when the user loads or is switched
  useEffect(() => {
    setDraft({ ...blankSchedule(), ...(schedule ?? {}) });
    setDirty(false);
  }, [schedule, userId]);

  const setDay = (day: WorkDayKey, patch: Partial<WorkDay>) => {
    setDraft((d) => ({ ...d, [day]: { ...d[day], ...patch } }));
    setDirty(true);
  };

  // 7 days x 4 fields is a lot of typing — copy Monday across the working week
  const copyMondayToWeekdays = () => {
    setDraft((d) => {
      const mon = d.mon;
      const next = { ...d };
      (["tue", "wed", "thu", "fri"] as WorkDayKey[]).forEach((k) => { next[k] = { ...mon }; });
      return next;
    });
    setDirty(true);
  };

  const hasAnySchedule = WORK_DAYS.some((d) => draft[d]?.enabled);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Work Schedule
            <span className="text-xs font-normal text-muted-foreground">
              {hasAnySchedule ? "" : "— not set"}
            </span>
          </CardTitle>

          {canEdit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={copyMondayToWeekdays}>
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy Mon → Fri</span>
              </Button>
              {hasAnySchedule && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => save({ id: userId, workSchedule: null })}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
              <Button
                size="sm"
                className="h-8 gap-1.5"
                disabled={!dirty || isPending}
                onClick={() => save({ id: userId, workSchedule: draft }, { onSuccess: () => setDirty(false) })}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {canEdit
            ? `Optional. Times are IST. Turn a day off for ${userName.split(" ")[0]}'s weekly off.`
            : "Times are shown in IST."}
        </p>
      </CardHeader>

      <CardContent className="space-y-2">
        {!canEdit && !hasAnySchedule && (
          <p className="py-6 text-center text-sm text-muted-foreground">No work schedule set.</p>
        )}

        {(canEdit || hasAnySchedule) && WORK_DAYS.map((day, i) => {
          const d = draft[day] ?? BLANK_DAY;
          if (!canEdit && !d.enabled) return null;
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <div className="flex w-32 shrink-0 items-center gap-2">
                {canEdit && (
                  <Switch
                    checked={d.enabled}
                    onCheckedChange={(v) => setDay(day, { enabled: v })}
                  />
                )}
                <span className={`text-sm font-medium ${d.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                  {WORK_DAY_LABELS[day]}
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {d.enabled ? (
                  <motion.div
                    key="times"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    {([
                      ["loginTime",  "Login"],
                      ["breakStart", "Break from"],
                      ["breakEnd",   "Break to"],
                      ["logoutTime", "Logout"],
                    ] as [keyof WorkDay, string][]).map(([field, label]) => (
                      <label key={String(field)} className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground w-[68px] sm:w-auto">{label}</span>
                        {canEdit ? (
                          <Input
                            type="time"
                            value={(d[field] as string) ?? ""}
                            onChange={(e) => setDay(day, { [field]: e.target.value } as Partial<WorkDay>)}
                            className="h-8 w-[104px] text-sm px-2 [color-scheme:dark]"
                          />
                        ) : (
                          <span className="text-sm font-mono">{(d[field] as string) || "—"}</span>
                        )}
                      </label>
                    ))}
                  </motion.div>
                ) : (
                  <motion.span
                    key="off"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted-foreground/60"
                  >
                    Weekly off
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
