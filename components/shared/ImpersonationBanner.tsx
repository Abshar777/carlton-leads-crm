"use client";
import { motion, AnimatePresence } from "framer-motion";
import { UserX, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export function ImpersonationBanner() {
  const { impersonating, originalAuth, stopImpersonation, user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  function handleExit() {
    stopImpersonation();
    queryClient.clear();
    router.push("/dashboard");
  }

  return (
    <AnimatePresence>
      {impersonating && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden shrink-0"
        >
          <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
            <div className="flex items-center gap-2 min-w-0">
              <UserX className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Viewing as <strong>{user?.name}</strong>
                {originalAuth?.user?.name && (
                  <span className="hidden sm:inline">
                    {" "}— logged in as <strong>{originalAuth.user.name}</strong>
                  </span>
                )}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleExit}
              className="flex items-center gap-1.5 rounded border border-white/40 px-3 py-1 text-xs font-semibold hover:bg-white/20 transition-colors shrink-0"
            >
              <LogOut className="h-3 w-3" />
              Exit
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
