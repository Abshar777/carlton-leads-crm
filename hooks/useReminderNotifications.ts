"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMyReminders } from "@/hooks/useReminders";

const THIRTY_MIN_MS = 30 * 60 * 1000;

function requestBrowserPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function fireBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // Android Chrome (and some mobile browsers) forbid `new Notification()` and
  // require ServiceWorkerRegistration.showNotification() instead.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, { body, icon: "/favicon.ico" });
      })
      .catch(() => {
        // SW not ready — silently skip (toast already shown)
      });
    return;
  }

  // Desktop fallback: new Notification() is fine
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // Unsupported — silently ignore
  }
}

export function useReminderNotifications() {
  const { data: reminders = [] } = useMyReminders();
  // Track which reminder IDs have already been notified to avoid duplicates.
  // We store two keys: "<id>:soon" (≤30 min) and "<id>:now" (past due).
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestBrowserPermission();
  }, []);

  useEffect(() => {
    if (!reminders.length) return;

    const now = Date.now();

    for (const r of reminders) {
      if (r.isDone) continue;

      const diff = new Date(r.remindAt).getTime() - now;
      const label = r.title ?? "Reminder";
      const leadName = (r as { lead?: { name?: string } }).lead?.name ?? "";

      // Overdue / exact time (diff <= 0 and not already notified as "now")
      if (diff <= 0 && !notified.current.has(`${r._id}:now`)) {
        notified.current.add(`${r._id}:now`);
        const body = leadName ? `${label} — ${leadName}` : label;
        toast.warning(`⏰ Reminder: ${label}`, {
          description: leadName || undefined,
          duration: 8000,
        });
        fireBrowserNotification(`⏰ ${label}`, body);
      }

      // Due within 30 minutes (and not already notified as "soon")
      if (diff > 0 && diff <= THIRTY_MIN_MS && !notified.current.has(`${r._id}:soon`)) {
        notified.current.add(`${r._id}:soon`);
        const mins = Math.ceil(diff / 60_000);
        const body = leadName
          ? `${label} — ${leadName} (in ${mins} min)`
          : `${label} (in ${mins} min)`;
        toast.info(`🔔 Upcoming: ${label}`, {
          description: leadName ? `${leadName} — in ${mins} min` : `In ${mins} min`,
          duration: 6000,
        });
        fireBrowserNotification(`🔔 ${label} in ${mins} min`, body);
      }
    }
  }, [reminders]);
}
