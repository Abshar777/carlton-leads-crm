"use client";

import { motion } from "framer-motion";
import { CalendarClock, Clock, Coffee, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkSchedules, useAssignWorkSchedule } from "@/hooks/useWorkSchedules";
import { DAY_KEYS, DAY_LABELS, type WorkSchedule } from "@/types";

const NONE = "__none__";

const MODE_STYLE: Record<string, string> = {
  full: "bg-primary text-primary-foreground border-primary",
  half: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  off:  "bg-muted/40 text-muted-foreground/60 border-border",
};

interface Props {
  userId: string;
  schedule?: WorkSchedule | string | null;
  /** Super Admin can change the assignment; everyone else sees it read-only. */
  canEdit: boolean;
}

export function WorkScheduleCard({ userId, schedule, canEdit }: Props) {
  const { data: schedules = [] } = useWorkSchedules();
  const { mutate: assign, isPending } = useAssignWorkSchedule();

  // The API populates this, but fall back to an id lookup so the card still
  // renders if it ever arrives unpopulated.
  const current: WorkSchedule | null =
    schedule && typeof schedule === "object"
      ? (schedule as WorkSchedule)
      : schedules.find((s) => s._id === schedule) ?? null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Work Schedule
            {!current && <span className="text-xs font-normal text-muted-foreground">— not set</span>}
          </CardTitle>

          {canEdit && (
            <Select
              value={current?._id ?? NONE}
              onValueChange={(v) => assign({ userId, scheduleId: v === NONE ? null : v })}
              disabled={isPending}
            >
              <SelectTrigger className="h-9 w-[220px] text-sm">
                <SelectValue placeholder="No schedule" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>No schedule</SelectItem>
                {schedules.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} · {s.loginTime}–{s.logoutTime}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {canEdit && (
          <p className="text-xs text-muted-foreground">
            Schedules are created under Settings → Work Schedules. Times are IST.
          </p>
        )}
      </CardHeader>

      <CardContent>
        {!current ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No work schedule assigned.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{current.loginTime}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{current.logoutTime}</span>
              </span>
              {current.breakStart && current.breakEnd && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Coffee className="h-3.5 w-3.5" />
                  Break {current.breakStart}–{current.breakEnd}
                </span>
              )}
              {current.graceMinutes > 0 && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  {current.graceMinutes} min grace
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DAY_KEYS.map((d, i) => {
                const mode = current.workDays?.[d] ?? "off";
                return (
                  <motion.span
                    key={d}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex min-w-[54px] flex-col items-center rounded-lg border px-2 py-1 ${MODE_STYLE[mode]}`}
                  >
                    <span className="text-xs font-semibold">{DAY_LABELS[d]}</span>
                    <span className="text-[10px] uppercase tracking-wide opacity-80">{mode}</span>
                  </motion.span>
                );
              })}
            </div>

            {current.description && (
              <p className="text-xs text-muted-foreground">{current.description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
