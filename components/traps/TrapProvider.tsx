"use client";
import { createContext, useContext, useCallback, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { usePathname } from "next/navigation";
import api from "@/lib/axios";

type TrapAction =
  | "download_leads"
  | "copy_phone"
  | "print_attempt"
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

  const logTrap = useCallback((opts: LogOptions) => {
    if (!isAuthenticated) return;
    api.post("/traps/log", { ...opts, page: pathname }).catch(() => {});
  }, [isAuthenticated, pathname]);

  const interceptWhatsApp = useCallback((_e: React.MouseEvent, leadId?: string, leadName?: string, phone?: string) => {
    logTrap({ action: "whatsapp_share", leadId, leadName, phoneNumber: phone });
  }, [logTrap]);

  // ── Global copy trap ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    function handleCopy(e: ClipboardEvent) {
      const selection = window.getSelection()?.toString() ?? "";
      if (!/\d{7,}/.test(selection.replace(/[\s\-+()]/g, ""))) return;

      const target = e.target as HTMLElement | null;
      const trapEl = target?.closest("[data-phone-trap]") as HTMLElement | null;
      if (!trapEl) return;

      e.preventDefault();
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
