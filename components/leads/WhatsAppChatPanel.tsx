"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2, Wifi, WifiOff, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useWAMessages,
  useWAStatus,
  useSendWAMessage,
  useMarkWARead,
  type WAMessage,
} from "@/hooks/useWhatsApp";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { waMessagesKey, WA_UNREAD_KEY } from "@/hooks/useWhatsApp";

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: WAMessage }) {
  const isOut = msg.direction === "outbound";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2", isOut && "flex-row-reverse")}
    >
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        isOut ? "bg-primary text-primary-foreground" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      )}>
        {isOut ? <User className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("flex flex-col gap-0.5 max-w-[78%]", isOut && "items-end")}>
        <div className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
          isOut
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-tl-sm",
        )}>
          {msg.body}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", hour12: true,
          })}
          {isOut && msg.agentId && (
            <span className="ml-1 opacity-70">
              · {(msg.agentId as { name: string }).name}
            </span>
          )}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface WhatsAppChatPanelProps {
  phone: string;
  leadName: string;
}

export function WhatsAppChatPanel({ phone, leadName }: WhatsAppChatPanelProps) {
  const { accessToken } = useAuthStore.getState();
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useWAMessages(phone);
  const { data: waStatus }                  = useWAStatus();
  const { mutate: sendMsg, isPending }       = useSendWAMessage(phone);
  const { mutate: markRead }                 = useMarkWARead(phone);

  const [input, setInput] = useState("");

  // Mark as read on open
  useEffect(() => {
    if (phone) markRead();
  }, [phone]); // eslint-disable-line

  // Real-time socket updates
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function onMessage(data: { phone: string }) {
      const last10 = phone.replace(/\D/g, "").slice(-10);
      if (data.phone?.slice(-10) === last10) {
        qc.invalidateQueries({ queryKey: waMessagesKey(phone) });
        qc.invalidateQueries({ queryKey: WA_UNREAD_KEY });
        markRead();
      }
    }

    socket.on("whatsapp:message", onMessage);
    return () => { socket.off("whatsapp:message", onMessage); };
  }, [phone, accessToken, qc]); // eslint-disable-line

  const connected = waStatus?.status === "connected";

  function handleSend() {
    const msg = input.trim();
    if (!msg || isPending) return;
    setInput("");
    sendMsg(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{leadName}</p>
            <p className="text-xs text-muted-foreground">{phone}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-xs",
            connected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {connected
            ? <><Wifi className="h-3 w-3" /> Connected</>
            : <><WifiOff className="h-3 w-3" /> Offline</>
          }
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send a message or wait for the customer to reach out
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg._id} msg={msg} />
            ))}
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        {!connected && (
          <p className="text-xs text-destructive text-center mb-2">
            WhatsApp not connected — go to Settings to scan QR
          </p>
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? "Type a message… (Enter to send)" : "WhatsApp not connected"}
            disabled={!connected || isPending}
            className="min-h-[44px] max-h-[120px] resize-none rounded-xl text-sm"
            rows={1}
          />
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!connected || !input.trim() || isPending}
              className="h-11 w-11 rounded-xl shrink-0 bg-emerald-500 hover:bg-emerald-600 border-0"
            >
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
