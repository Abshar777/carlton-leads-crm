"use client";
import { createContext, useContext, useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { usePathname } from "next/navigation";
import api from "@/lib/axios";

type TrapAction =
  | "download_leads"
  | "copy_phone"
  | "print_attempt"
  | "screenshot_attempt"
  | "whatsapp_share";

interface LogOptions {
  action: TrapAction;
  leadId?: string;
  leadName?: string;
  phoneNumber?: string;
}

interface TrapContextValue {
  logTrap: (opts: LogOptions) => void;
  wrapPhoneElement: (el: HTMLElement | null, leadId?: string, leadName?: string, phone?: string) => void;
  interceptWhatsApp: (e: React.MouseEvent, leadId?: string, leadName?: string, phone?: string) => void;
}

const TrapContext = createContext<TrapContextValue | null>(null);

export function useTrap() {
  const ctx = useContext(TrapContext);
  if (!ctx) throw new Error("useTrap must be used inside TrapProvider");
  return ctx;
}

export function TrapProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  // Track last visibility-hidden time to detect rapid tab switches (screenshot tools)
  const hiddenAt = useRef<number | null>(null);

  const logTrap = useCallback((opts: LogOptions) => {
    if (!isAuthenticated) return;
    api.post("/traps/log", { ...opts, page: pathname }).catch(() => {});
  }, [isAuthenticated, pathname]);

  const interceptWhatsApp = useCallback((e: React.MouseEvent, leadId?: string, leadName?: string, phone?: string) => {
    // Log silently, let the navigation proceed
    logTrap({ action: "whatsapp_share", leadId, leadName, phoneNumber: phone });
  }, [logTrap]);

  // ── Global copy trap ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    function handleCopy(e: ClipboardEvent) {
      const selection = window.getSelection()?.toString() ?? "";
      // Only care about strings that look like phone numbers (7+ digits)
      if (!/\d{7,}/.test(selection.replace(/[\s\-+()]/g, ""))) return;

      // Find the closest element with data-phone-trap attribute
      const target = e.target as HTMLElement | null;
      const trapEl = target?.closest("[data-phone-trap]") as HTMLElement | null;
      if (!trapEl) return;

      e.preventDefault();
      // Overwrite clipboard with empty string — silent to the user
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", "");
      } else {
        navigator.clipboard.writeText("").catch(() => {});
      }

      const leadId   = trapEl.dataset.leadId;
      const leadName = trapEl.dataset.leadName;
      const phone    = trapEl.dataset.phone ?? selection;
      logTrap({ action: "copy_phone", leadId, leadName, phoneNumber: phone });
    }

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut",  handleCopy);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut",  handleCopy);
    };
  }, [isAuthenticated, logTrap]);

  // ── Print trap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    function handleBeforePrint() {
      logTrap({ action: "print_attempt" });
    }
    window.addEventListener("beforeprint", handleBeforePrint);
    return () => window.removeEventListener("beforeprint", handleBeforePrint);
  }, [isAuthenticated, logTrap]);

  // ── Screenshot trap (rapid tab-switch detection) ─────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    function handleVisibility() {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else {
        if (hiddenAt.current !== null) {
          const elapsed = Date.now() - hiddenAt.current;
          // Less than 3 seconds away = likely screenshot tool
          if (elapsed < 3000) {
            logTrap({ action: "screenshot_attempt" });
          }
          hiddenAt.current = null;
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isAuthenticated, logTrap]);

  const wrapPhoneElement = useCallback(
    (el: HTMLElement | null, leadId?: string, leadName?: string, phone?: string) => {
      if (!el) return;
      el.dataset.phoneTrap = "1";
      if (leadId)   el.dataset.leadId   = leadId;
      if (leadName) el.dataset.leadName = leadName;
      if (phone)    el.dataset.phone    = phone;
    },
    [],
  );

  return (
    <TrapContext.Provider value={{ logTrap, wrapPhoneElement, interceptWhatsApp }}>
      {children}
    </TrapContext.Provider>
  );
}
