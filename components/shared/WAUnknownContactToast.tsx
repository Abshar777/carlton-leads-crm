"use client";

import { useEffect, useRef }        from "react";
import { useRouter }                from "next/navigation";
import { toast }                    from "sonner";
import { UserPlus, MessageCircle }  from "lucide-react";

import { getSocket }               from "@/lib/socket";
import { useAuthStore }            from "@/lib/store/authStore";
import { useCreateLeadFromChat }    from "@/hooks/useWhatsApp";
import type { WAUnknownContact }    from "@/hooks/useWhatsApp";

/**
 * Mounted once in the dashboard layout.
 * Listens for whatsapp:unknown_contact socket events and shows
 * a sticky Sonner toast with quick-action buttons.
 */
export function WAUnknownContactToast() {
  const router       = useRouter();
  const { accessToken } = useAuthStore();
  const toastIds     = useRef<Map<string, string | number>>(new Map());

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function handleUnknown(data: WAUnknownContact) {
      // Deduplicate: one toast per phone number at a time
      const existingId = toastIds.current.get(data.phone);
      if (existingId) toast.dismiss(existingId);

      const id = toast(
        <UnknownContactContent
          data={data}
          onViewPortal={() => {
            toast.dismiss(id);
            toastIds.current.delete(data.phone);
            router.push("/whatsapp");
          }}
          onDismiss={() => {
            toast.dismiss(id);
            toastIds.current.delete(data.phone);
          }}
        />,
        {
          duration:  Infinity,
          position:  "bottom-right",
          className: "!p-0 !bg-transparent !border-none !shadow-none",
          style:     { padding: 0, background: "transparent", border: "none" },
        }
      );

      toastIds.current.set(data.phone, id);
    }

    socket.on("whatsapp:unknown_contact", handleUnknown);
    return () => { socket.off("whatsapp:unknown_contact", handleUnknown); };
  }, [accessToken, router]);

  return null;
}

// ── Inner content component ───────────────────────────────────────────────────

interface ContentProps {
  data:          WAUnknownContact;
  onViewPortal:  () => void;
  onDismiss:     () => void;
}

function UnknownContactContent({ data, onViewPortal, onDismiss }: ContentProps) {
  const { mutate: createLead, isPending } = useCreateLeadFromChat(data.phone);

  function handleCreate() {
    createLead(data.senderName, {
      onSuccess: () => {
        onDismiss();
      },
    });
  }

  return (
    <div className="w-80 rounded-xl border border-border bg-card shadow-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={18} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">New WhatsApp Contact</p>
          <p className="text-xs text-muted-foreground truncate">
            {data.senderName || data.phone} · {data.phone}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Message preview */}
      <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 line-clamp-2">
        &ldquo;{data.body}&rdquo;
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <UserPlus size={12} />
          {isPending ? "Creating…" : "Create Lead"}
        </button>
        <button
          onClick={onViewPortal}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium h-8 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          <MessageCircle size={12} />
          View Chat
        </button>
      </div>
    </div>
  );
}
