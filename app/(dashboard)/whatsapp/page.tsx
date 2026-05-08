"use client";

import { useState, useEffect, useRef }  from "react";
import { motion, AnimatePresence }       from "framer-motion";
import {
  MessageCircle, Search, Send, X, UserPlus, Link2, Phone,
  CheckCheck, Check, ChevronLeft, RefreshCw, Settings2,
  Wifi, WifiOff, QrCode, Loader2, User, Paperclip,
  FileText, Volume2, ImageIcon, Video,
} from "lucide-react";


import { Button }       from "@/components/ui/button";
import { Input }        from "@/components/ui/input";
import { Badge }        from "@/components/ui/badge";
import { Switch }       from "@/components/ui/switch";
import { Label }        from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { useLeads }             from "@/hooks/useLeads";
import {
  useWAStatus,
  useWAChats,
  usePortalMessages,
  useMarkChatRead,
  useAssignLeadToChat,
  useCreateLeadFromChat,
  useWASettings,
  useUpdateWASettings,
  useSendWAMessage,
  useSendMedia,
  useConnectWA,
  useDisconnectWA,
  type WAChat,
  type WAMessage,
} from "@/hooks/useWhatsApp";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store/authStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ── Animation variants ────────────────────────────────────────────────────────

const pageVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "connected")
    return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">Connected</Badge>;
  if (status === "connecting" || status === "qr_ready")
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs animate-pulse">Connecting</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">Disconnected</Badge>;
}

// ── Chat list item ────────────────────────────────────────────────────────────

interface ChatItemProps {
  chat:    WAChat;
  active:  boolean;
  onClick: () => void;
}

function ChatItem({ chat, active, onClick }: ChatItemProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border/50",
        "transition-colors hover:bg-muted/50",
        active ? "bg-primary/8 border-l-2 border-l-primary" : "",
      ].join(" ")}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-sm font-semibold text-primary">
          {(chat.lead?.name ?? chat.senderName ?? chat.phone).charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium truncate">
            {chat.lead?.name ?? chat.senderName ?? chat.phone}
          </span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {chat.lastAt ? timeAgo(chat.lastAt) : ""}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastBody}</p>
        {!chat.lead && (
          <span className="text-[10px] text-yellow-600 flex items-center gap-0.5 mt-0.5">
            <User size={9} /> Unknown contact
          </span>
        )}
      </div>

      {chat.unread > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 mt-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
        >
          {chat.unread}
        </motion.span>
      )}
    </motion.button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MediaContent({ msg, isOut }: { msg: WAMessage; isOut: boolean }) {
  if (!msg.mediaData || !msg.mimeType) return null;

  const src       = `data:${msg.mimeType};base64,${msg.mediaData}`;
  const textColor = isOut ? "text-primary-foreground/80" : "text-muted-foreground";

  if (msg.mediaType === "image" || msg.mediaType === "sticker") {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="block mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={msg.body || "Image"}
          className="max-w-[260px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      </a>
    );
  }

  if (msg.mediaType === "video") {
    return (
      <div className="mb-1">
        <video controls className="max-w-[260px] rounded-xl" style={{ maxHeight: 200 }}>
          <source src={src} type={msg.mimeType} />
        </video>
      </div>
    );
  }

  if (msg.mediaType === "audio") {
    return (
      <div className={`flex items-center gap-2 mb-1 ${textColor}`}>
        <Volume2 size={16} />
        <audio controls className="h-8 w-full max-w-[220px]">
          <source src={src} type={msg.mimeType} />
        </audio>
      </div>
    );
  }

  if (msg.mediaType === "document") {
    return (
      <a
        href={src}
        download={msg.fileName ?? "document"}
        className={`flex items-center gap-2 mb-1 text-xs underline underline-offset-2 ${textColor}`}
      >
        <FileText size={15} />
        <span className="truncate max-w-[200px]">{msg.fileName || "Download document"}</span>
      </a>
    );
  }

  return null;
}

function MessageBubble({ msg }: { msg: WAMessage }) {
  const isOut = msg.direction === "outbound";
  const hasMedia = !!msg.mediaData;
  const hasText  = msg.body && msg.body !== msg.fileName && !["📷 Photo","🎥 Video","🎤 Voice note","🎵 Audio","🔖 Sticker","📍 Location","📍 Live Location"].includes(msg.body);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={["flex", isOut ? "justify-end" : "justify-start"].join(" ")}
    >
      <div
        className={[
          "max-w-[75%] rounded-2xl text-sm shadow-sm overflow-hidden",
          hasMedia ? "p-1.5" : "px-3 py-2",
          isOut
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border/60 text-foreground rounded-bl-sm",
        ].join(" ")}
      >
        {hasMedia && (
          <div className={hasMedia && !hasText ? "" : "px-1.5 pt-1"}>
            <MediaContent msg={msg} isOut={isOut} />
          </div>
        )}
        {hasText && (
          <p className={["whitespace-pre-wrap break-words leading-relaxed", hasMedia ? "px-2 pb-1" : ""].join(" ")}>
            {msg.body}
          </p>
        )}
        {/* Show icon label for pure media with no caption */}
        {hasMedia && !hasText && (
          <div className={["flex items-center gap-1 px-2 text-xs opacity-80", isOut ? "text-primary-foreground" : "text-muted-foreground"].join(" ")}>
            {msg.mediaType === "image"    && <><ImageIcon size={10} /> Photo</>}
            {msg.mediaType === "video"    && <><Video size={10} /> Video</>}
            {msg.mediaType === "audio"    && <><Volume2 size={10} /> Audio</>}
            {msg.mediaType === "document" && <><FileText size={10} /> {msg.fileName || "Document"}</>}
            {msg.mediaType === "sticker"  && <><ImageIcon size={10} /> Sticker</>}
          </div>
        )}
        <div className={[
          "flex items-center gap-1 mt-1 text-[10px] px-1.5 pb-0.5",
          isOut ? "justify-end text-primary-foreground/70" : "text-muted-foreground",
        ].join(" ")}>
          <span>{fmtTime(msg.createdAt)}</span>
          {isOut && (msg.read ? <CheckCheck size={12} /> : <Check size={12} />)}
        </div>
      </div>
    </motion.div>
  );
}

// ── Assign lead dialog ────────────────────────────────────────────────────────

interface AssignDialogProps {
  phone:   string;
  open:    boolean;
  onClose: () => void;
}

function AssignLeadDialog({ phone, open, onClose }: AssignDialogProps) {
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState("");

  const leadsResult = useLeads({ search, limit: 20 });
  const leads = Array.isArray(leadsResult.data)
    ? leadsResult.data
    : (leadsResult.data as { data?: { _id: string; name: string; phone: string }[] })?.data ?? [];

  const { mutate: assign, isPending }        = useAssignLeadToChat(phone);
  const { mutate: create, isPending: creating } = useCreateLeadFromChat(phone);

  function handleAssign() {
    if (!selected) return;
    assign(selected, { onSuccess: onClose });
  }

  function handleCreate() {
    create(undefined, { onSuccess: onClose });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 size={18} className="text-primary" />
            Assign to Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <Input
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />

          <div className="max-h-60 overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2">
            <AnimatePresence>
              {leads.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No leads found</p>
              )}
              {leads.map((lead) => (
                <motion.button
                  key={lead._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelected(lead._id)}
                  className={[
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    selected === lead._id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted",
                  ].join(" ")}
                >
                  <span className="font-medium">{lead.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{lead.phone}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 size={14} className="animate-spin mr-1" /> : <UserPlus size={14} className="mr-1" />}
            Create new lead
          </Button>
          <Button size="sm" onClick={handleAssign} disabled={!selected || isPending}>
            {isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Link2 size={14} className="mr-1" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  chat:     WAChat;
  onBack:   () => void;
  isMobile: boolean;
}

function ChatPanel({ chat, onBack, isMobile }: ChatPanelProps) {
  const [text, setText]             = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const { data: messages = [], refetch }            = usePortalMessages(chat.phone);
  const { mutate: markRead }                        = useMarkChatRead(chat.phone);
  const { mutate: send, isPending }                 = useSendWAMessage(chat.phone);
  const { mutate: sendMedia, isPending: sendingMedia } = useSendMedia(chat.phone);

  const isSending = isPending || sendingMedia;

  useEffect(() => { markRead(); }, [chat.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const { accessToken } = useAuthStore();
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    const handler = (data: { phone: string }) => {
      if (data.phone.slice(-10) === chat.phone.slice(-10)) refetch();
    };
    socket.on("whatsapp:message", handler);
    return () => { socket.off("whatsapp:message", handler); };
  }, [accessToken, chat.phone, refetch]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    send(trimmed, { onSuccess: () => { setText(""); refetch(); } });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    sendMedia({ file, caption: "" }, { onSuccess: () => refetch() });
    e.target.value = "";
  }

  const displayName = chat.lead?.name ?? chat.senderName ?? chat.phone;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ChevronLeft size={18} />
          </Button>
        )}
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone size={10} /> {chat.phone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!chat.lead && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssignOpen(true)}
              className="h-8 text-xs gap-1.5 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
            >
              <UserPlus size={13} /> Assign Lead
            </Button>
          )}
          {chat.lead && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Link2 size={10} /> {chat.lead.name}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Unknown contact banner */}
      <AnimatePresence>
        {!chat.lead && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2.5 flex items-center gap-3"
          >
            <User size={15} className="text-yellow-600 flex-shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400 flex-1">
              This contact has no linked lead.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssignOpen(true)}
              className="h-7 text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
            >
              <Link2 size={11} className="mr-1" /> Link
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <MessageBubble key={msg._id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-3 flex gap-2 bg-card/50 items-center">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          className="hidden"
          onChange={handleFileChange}
        />
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          title="Send image, video or document"
          className="h-10 w-10 flex-shrink-0 rounded-md border border-border bg-background text-muted-foreground flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {sendingMedia ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
        </motion.button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder={isSending ? "Sending…" : "Type a message…"}
          className="flex-1 h-10"
          disabled={isSending}
        />
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="h-10 w-10 flex-shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-primary/90"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </motion.button>
      </div>

      <AssignLeadDialog
        phone={chat.phone}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
    </div>
  );
}

// ── Connection panel ──────────────────────────────────────────────────────────

function ConnectionPanel() {
  const { data: status }                              = useWAStatus();
  const { mutate: connect, isPending: connecting }    = useConnectWA();
  const { mutate: disconnect }                        = useDisconnectWA();

  if (!status || status.status === "disconnected") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <WifiOff size={28} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">WhatsApp not connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your WhatsApp to start chatting</p>
        </div>
        <Button onClick={() => connect()} disabled={connecting} className="gap-2">
          {connecting ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
          Connect WhatsApp
        </Button>
      </div>
    );
  }

  if (status.status === "qr_ready" && status.qrImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
          <QrCode size={28} className="text-green-600" />
        </div>
        <div>
          <p className="font-semibold">Scan QR Code</p>
          <p className="text-sm text-muted-foreground mt-1">Open WhatsApp → Linked Devices → Link a Device</p>
        </div>
        <div className="border-2 border-border rounded-xl p-3 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={status.qrImage} alt="QR Code" className="w-48 h-48" />
        </div>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>Cancel</Button>
      </div>
    );
  }

  if (status.status === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Connecting to WhatsApp…</p>
      </div>
    );
  }

  return null;
}

// ── Settings panel ────────────────────────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { data: settings }                               = useWASettings();
  const { mutate: update, isPending }                    = useUpdateWASettings();
  const { data: status }                                 = useWAStatus();
  const { mutate: connect, isPending: connecting }       = useConnectWA();
  const { mutate: disconnect, isPending: disconnecting } = useDisconnectWA();

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 260 }}
      className="absolute inset-y-0 right-0 w-80 bg-card border-l border-border shadow-xl flex flex-col z-20"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="font-semibold text-sm">WhatsApp Settings</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Connection status */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connection</p>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              <StatusBadge status={status?.status ?? "disconnected"} />
            </div>
            {status?.status === "connected" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect()}
                disabled={disconnecting}
                className="border-red-500/30 text-red-600 hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => connect()}
                disabled={connecting || status?.status === "qr_ready"}
              >
                {connecting && <Loader2 size={13} className="animate-spin mr-1" />}
                Connect
              </Button>
            )}
          </div>
          {status?.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone size={11} /> +{status.phone}
            </p>
          )}
        </div>

        {/* Auto create leads */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lead Options</p>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div>
              <Label htmlFor="auto-create" className="text-sm font-medium cursor-pointer">
                Auto-create leads
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically create a lead for every new contact
              </p>
            </div>
            <Switch
              id="auto-create"
              checked={settings?.autoCreateLeads ?? false}
              disabled={isPending}
              onCheckedChange={(v) => update({ autoCreateLeads: v })}
            />
          </div>
          {!settings?.autoCreateLeads && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              When off, you&apos;ll be prompted to assign or create a lead for each new contact.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WhatsAppPortalPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [chatSearch, setChatSearch]       = useState("");
  const [showSettings, setShowSettings]   = useState(false);
  const [isMobile, setIsMobile]           = useState(false);

  const { data: waStatus }                              = useWAStatus();
  const { data: chats = [], refetch: refetchChats }     = useWAChats();

  const selectedChat = chats.find((c) => c.phone === selectedPhone) ?? null;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { accessToken } = useAuthStore();
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    socket.on("whatsapp:message",         () => refetchChats());
    socket.on("whatsapp:unknown_contact", () => refetchChats());
    return () => {
      socket.off("whatsapp:message");
      socket.off("whatsapp:unknown_contact");
    };
  }, [accessToken, refetchChats]);

  const filteredChats = chats.filter((c) => {
    const q = chatSearch.toLowerCase();
    return (
      c.phone.includes(q) ||
      (c.senderName ?? "").toLowerCase().includes(q) ||
      (c.lead?.name ?? "").toLowerCase().includes(q) ||
      c.lastBody.toLowerCase().includes(q)
    );
  });

  const isConnected    = waStatus?.status === "connected";
  const isConnecting   = waStatus?.status === "connecting" || waStatus?.status === "qr_ready";
  const hasChats       = chats.length > 0;
  // Show the chat list if connected, connecting, OR if there are existing chats to browse
  const showChatList   = isConnected || isConnecting || hasChats;
  const showList       = !isMobile || !selectedPhone;
  const showPanel      = !isMobile || !!selectedPhone;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="flex h-[calc(100vh-64px)] bg-background overflow-hidden relative"
    >
      {/* ── Left: chat list ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {showList && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={[
              "flex flex-col border-r border-border/50 bg-card/50",
              isMobile ? "w-full" : "w-[320px] flex-shrink-0",
            ].join(" ")}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle size={20} className="text-primary" />
                  <h1 className="font-semibold text-base">WhatsApp</h1>
                  <StatusBadge status={waStatus?.status ?? "disconnected"} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSettings((v) => !v)}
                >
                  <Settings2 size={15} />
                </Button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search chats…"
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {!showChatList ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <WifiOff size={32} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Connect your WhatsApp to see chats</p>
                  <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
                    <Settings2 size={13} className="mr-1.5" /> Open Settings
                  </Button>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                  <MessageCircle size={32} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {chatSearch ? "No chats match your search" : "No chats yet"}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <ChatItem
                    key={chat.phone}
                    chat={chat}
                    active={chat.phone === selectedPhone}
                    onClick={() => setSelectedPhone(chat.phone)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right: chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <AnimatePresence mode="wait">
          {showPanel && selectedChat ? (
            <motion.div
              key={selectedPhone}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0"
            >
              <ChatPanel
                chat={selectedChat}
                onBack={() => setSelectedPhone(null)}
                isMobile={isMobile}
              />
            </motion.div>
          ) : !isConnected && !hasChats ? (
            <ConnectionPanel key="connect" />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-3 text-center px-8"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle size={36} className="text-primary/60" />
              </div>
              <p className="font-semibold text-lg">Select a conversation</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Choose a chat from the left to start messaging
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Settings panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
