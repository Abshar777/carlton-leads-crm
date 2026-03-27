"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, CheckCircle2, UserCheck, MessageCircle, StickyNote, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store/authStore";
import { usePushNotification } from "@/hooks/usePushNotification";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppNotification {
  id: string;
  type: "lead_assigned" | "team_message" | "status_changed" | "note_added" | string;
  title: string;
  body: string;
  url?: string;
  createdAt: string;
  read: boolean;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  lead_assigned:  { icon: UserCheck,      color: "text-teal-400",   bg: "bg-teal-500/15"   },
  team_message:   { icon: MessageCircle,  color: "text-blue-400",   bg: "bg-blue-500/15"   },
  status_changed: { icon: CheckCircle2,   color: "text-violet-400", bg: "bg-violet-500/15" },
  note_added:     { icon: StickyNote,     color: "text-green-400",  bg: "bg-green-500/15"  },
};
const DEFAULT_TYPE = { icon: Bell, color: "text-primary", bg: "bg-primary/15" };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { accessToken } = useAuthStore();
  const { permission, isSubscribed, isLoading: pushLoading, requestPermission } = usePushNotification();

  const unread = notifications.filter((n) => !n.read).length;

  // ── Show push permission banner if not yet granted ────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem("push-banner-dismissed");
    if (!dismissed && permission === "default" && !isSubscribed) {
      const timer = setTimeout(() => setShowPermissionBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [permission, isSubscribed]);

  // ── Listen for real-time notifications via socket ─────────────────────────
  useEffect(() => {
    if (!accessToken || typeof window === "undefined") return;
    const socket = getSocket(accessToken);

    const handler = (payload: Omit<AppNotification, "id" | "read">) => {
      const notif: AppNotification = {
        ...payload,
        id: `${Date.now()}-${Math.random()}`,
        read: false,
      };
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      showFlash(notif);
    };

    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [accessToken]);

  // ── Close panel when clicking outside ────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Push permission banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showPermissionBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute right-0 top-12 z-50 w-72 sm:w-80 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/15 p-2 shrink-0">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Stay in the loop</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Get notified when leads are assigned to you or your team gets updates.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={pushLoading}
                    onClick={async () => {
                      await requestPermission();
                      setShowPermissionBanner(false);
                    }}
                  >
                    {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                    Enable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => {
                      setShowPermissionBanner(false);
                      sessionStorage.setItem("push-banner-dismissed", "1");
                    }}
                  >
                    Not now
                  </Button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPermissionBanner(false);
                  sessionStorage.setItem("push-banner-dismissed", "1");
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bell button ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open) markAllRead(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Notifications"
      >
        {permission === "denied" ? (
          <BellOff className="h-4.5 w-4.5" />
        ) : (
          <Bell className="h-[18px] w-[18px]" />
        )}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ── Notification panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                {unread > 0 && (
                  <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Push toggle */}
                <button
                  title={isSubscribed ? "Push notifications on" : "Enable push notifications"}
                  onClick={isSubscribed ? undefined : requestPermission}
                  disabled={pushLoading || permission === "denied"}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                    isSubscribed
                      ? "text-green-400 bg-green-500/10 hover:bg-green-500/20"
                      : permission === "denied"
                      ? "text-red-400/60 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {pushLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isSubscribed ? (
                    <Bell className="h-3 w-3" />
                  ) : (
                    <BellOff className="h-3 w-3" />
                  )}
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/40 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border/40">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="rounded-full bg-muted/50 p-4">
                    <Bell className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  {!isSubscribed && permission !== "denied" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 mt-1"
                      disabled={pushLoading}
                      onClick={requestPermission}
                    >
                      {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                      Enable push
                    </Button>
                  )}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((notif) => {
                    const cfg = TYPE_CONFIG[notif.type] ?? DEFAULT_TYPE;
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group ${!notif.read ? "bg-primary/5" : ""}`}
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(notif.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {notif.url && (
                            <Link href={notif.url} onClick={() => setOpen(false)}>
                              <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </Link>
                          )}
                          <button
                            onClick={() => dismiss(notif.id)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {!notif.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</span>
                <button
                  onClick={() => setNotifications([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Flash toast (shown for 4 seconds) ────────────────────────────────────────

let flashContainer: HTMLDivElement | null = null;

function showFlash(notif: AppNotification) {
  if (typeof window === "undefined") return;

  if (!flashContainer) {
    flashContainer = document.createElement("div");
    flashContainer.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(flashContainer);
  }

  const cfg = TYPE_CONFIG[notif.type] ?? DEFAULT_TYPE;

  const toast = document.createElement("div");
  toast.style.cssText = `
    display: flex; align-items: flex-start; gap: 10px;
    background: hsl(var(--card) / 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid hsl(var(--border) / 0.6);
    border-radius: 12px;
    padding: 12px 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    max-width: 320px;
    pointer-events: auto;
    cursor: pointer;
    transition: opacity 0.3s ease, transform 0.3s ease;
    transform: translateX(120%);
    opacity: 0;
  `;

  toast.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;flex-shrink:0;background:hsl(var(--muted))">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#94a3b8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </div>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:600;color:hsl(var(--foreground));margin:0;line-height:1.3;">${escapeHtml(notif.title)}</p>
      <p style="font-size:11px;color:hsl(var(--muted-foreground));margin:4px 0 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(notif.body)}</p>
    </div>
  `;

  if (notif.url) {
    toast.onclick = () => { window.location.href = notif.url!; };
  }

  flashContainer.appendChild(toast);

  // Slide in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
    });
  });

  // Slide out and remove
  setTimeout(() => {
    toast.style.transform = "translateX(120%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
