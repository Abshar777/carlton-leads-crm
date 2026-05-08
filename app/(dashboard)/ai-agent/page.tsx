"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Trash2, Loader2, Sparkles, User, BrainCircuit,
  Cpu, CloudLightning, Zap, RefreshCw, Plus, MessageSquare,
  Pencil, Check, X, MoreVertical, PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useAiSessions,
  useAiSessionMessages,
  useCreateAiSession,
  useRenameAiSession,
  useDeleteAiSession,
  useAiChatWithSession,
  useAiModels,
  AI_SESSIONS_KEY,
  aiSessionMessagesKey,
  type AiMessage,
  type AiSession,
} from "@/hooks/useAiChat";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store/authStore";
import { useQueryClient } from "@tanstack/react-query";

// ── Animation variants ────────────────────────────────────────────────────────

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const msgVariants = {
  hidden:  { opacity: 0, y: 10, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
};

const sidebarItemVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

// ── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: "📊", label: "Overall summary",   text: "Give me a summary of the overall CRM performance right now." },
  { icon: "🏆", label: "Top performers",    text: "Who are the top 5 performers this month? Show conversion rates." },
  { icon: "⚠️",  label: "Problem leads",    text: "Which lead statuses are the biggest bottleneck in the pipeline?" },
  { icon: "📈", label: "Growth tips",       text: "What specific actions can we take to improve our booking conversion rate?" },
  { icon: "🔔", label: "Due today",         text: "Summarize what the team should be focused on today based on the data." },
  { icon: "💰", label: "Revenue analysis",  text: "Analyze the revenue pipeline. What's the potential if all interested leads convert?" },
  { icon: "👥", label: "Team comparison",   text: "Compare team performance and identify which team needs the most support." },
  { icon: "📉", label: "Drop-off analysis", text: "Why might leads be dropping off? Which status has the highest abandonment?" },
];

// ── Markdown-lite renderer ────────────────────────────────────────────────────

function renderContent(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted/80 text-xs font-mono border border-border/50">$1</code>')
    .replace(/^#{1,3} (.+)$/gm, "<strong class=\"text-base\">$1</strong>")
    .replace(/^[-•] (.+)$/gm, "• $1")
    .replace(/\n/g, "<br/>");
}

// ── Provider badge ────────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return null;
  const isOllama = provider.startsWith("ollama:");
  const label = isOllama
    ? provider.replace("ollama:", "🦙 ")
    : provider.replace("gemini:", "✨ Gemini ");
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
        isOllama
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
          : "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
      )}
    >
      {label}
    </motion.span>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

interface DisplayMessage extends AiMessage {
  provider?: string;
  isTyping?: boolean;
  typingText?: string;
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === "user";
  const content = msg.isTyping ? (msg.typingText ?? "") : msg.content;

  return (
    <motion.div
      variants={msgVariants}
      initial="hidden"
      animate="visible"
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white",
      )}>
        {isUser ? <User className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[80%]", isUser && "items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border/50 text-foreground rounded-tl-sm",
        )}>
          <span
            dangerouslySetInnerHTML={{ __html: renderContent(content) }}
            className="[&_strong]:font-semibold [&_em]:italic [&_code]:inline"
          />
          {msg.isTyping && (
            <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-current animate-pulse align-middle" />
          )}
        </div>
        <div className={cn("flex items-center gap-2", isUser && "flex-row-reverse")}>
          <span className="text-[10px] text-muted-foreground">
            {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
              hour: "2-digit", minute: "2-digit", hour12: true,
            })}
          </span>
          {!isUser && !msg.isTyping && msg.provider && (
            <ProviderBadge provider={msg.provider} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Typing dots indicator ─────────────────────────────────────────────────────

function TypingDotsIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
        <BrainCircuit className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-card border border-border/50 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 h-5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-violet-400"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Model status bar ──────────────────────────────────────────────────────────

function ModelStatusBar() {
  const { data: modelInfo, isLoading, refetch } = useAiModels();

  if (isLoading) return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Checking AI provider…
    </div>
  );
  if (!modelInfo) return null;

  const isOllama = modelInfo.activeProvider.startsWith("ollama:");
  const isNone   = modelInfo.activeProvider === "none";

  return (
    <div className={cn(
      "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
      isNone
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : isOllama
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          : "border-violet-500/20 bg-violet-500/5 text-violet-700 dark:text-violet-400",
    )}>
      <div className="flex items-center gap-2">
        {isNone ? (
          <><CloudLightning className="h-3.5 w-3.5" /> No AI provider available</>
        ) : isOllama ? (
          <><Cpu className="h-3.5 w-3.5" /> Local AI — {modelInfo.ollama.activeModel}</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5" /> Google Gemini — {modelInfo.gemini.model}</>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isNone && (
          <span className="text-muted-foreground hidden sm:block">
            Run: <code className="font-mono bg-muted px-1 rounded">ollama pull llama3.2</code>
          </span>
        )}
        <button onClick={() => refetch()} className="rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full py-12 px-4 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 mb-4 shadow-lg">
        <BrainCircuit className="h-8 w-8 text-violet-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Start a conversation</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        Ask anything about your CRM — leads, teams, performance, trends.
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {QUICK_PROMPTS.map((p) => (
          <motion.button
            key={p.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggest(p.text)}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60 hover:border-primary/30"
          >
            <span className="text-base shrink-0">{p.icon}</span>
            <span className="text-muted-foreground font-medium">{p.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Session item ──────────────────────────────────────────────────────────────

interface SessionItemProps {
  session:   AiSession;
  isActive:  boolean;
  onSelect:  () => void;
  onRename:  (name: string) => void;
  onDelete:  () => void;
}

function SessionItem({ session, isActive, onSelect, onRename, onDelete }: SessionItemProps) {
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(session.sessionName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editMode) {
      setEditValue(session.sessionName);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editMode, session.sessionName]);

  function commitRename() {
    const name = editValue.trim();
    if (name && name !== session.sessionName) onRename(name);
    setEditMode(false);
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000)   return "just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  return (
    <motion.div
      variants={sidebarItemVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "group relative flex items-start gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      onClick={() => { if (!editMode) onSelect(); }}
    >
      <MessageSquare className={cn("h-4 w-4 mt-0.5 shrink-0", isActive && "text-primary")} />

      <div className="flex-1 min-w-0">
        {editMode ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditMode(false);
              }}
              className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm text-foreground outline-none"
            />
            <button onClick={commitRename} className="text-green-500 hover:text-green-400 shrink-0">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditMode(false)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className={cn("text-xs font-medium truncate", isActive ? "text-primary" : "text-foreground")}>
              {session.sessionName}
            </p>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              {session.lastPreview ? (
                <p className="text-[10px] text-muted-foreground truncate flex-1">
                  {session.lastPreview}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground/50 italic">Empty</p>
              )}
              <span className="text-[9px] text-muted-foreground shrink-0">
                {formatTime(session.lastMessageAt ?? session.updatedAt)}
              </span>
            </div>
          </>
        )}
      </div>

      {!editMode && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setEditMode(true)} className="gap-2 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-xs text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </motion.div>
  );
}

// ── Sessions sidebar ──────────────────────────────────────────────────────────

interface SessionSidebarProps {
  sessions:        AiSession[];
  activeSessionId: string | null;
  isLoading:       boolean;
  onSelect:        (id: string) => void;
  onNew:           () => void;
  onRename:        (id: string, name: string) => void;
  onDelete:        (id: string) => void;
}

function SessionSidebar({ sessions, activeSessionId, isLoading, onSelect, onNew, onRename, onDelete }: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 text-xs font-semibold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center px-3">
            <Bot className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No chats yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Click "New Chat" to start</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sessions.map((s) => (
              <SessionItem
                key={s.sessionId}
                session={s}
                isActive={s.sessionId === activeSessionId}
                onSelect={() => onSelect(s.sessionId)}
                onRename={(name) => onRename(s.sessionId, name)}
                onDelete={() => onDelete(s.sessionId)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          {sessions.length} chat{sessions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AiAgentPage() {
  const { accessToken } = useAuthStore.getState();
  const qc = useQueryClient();

  // ── Sessions state ────────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [deleteTarget, setDeleteTarget]       = useState<string | null>(null);

  const { data: sessions = [], isLoading: loadingSessions } = useAiSessions("report", "global");
  const { mutateAsync: createSession, isPending: creatingSession } = useCreateAiSession();
  const { mutate: renameSession }  = useRenameAiSession();
  const { mutate: deleteSession }  = useDeleteAiSession();

  // Auto-select first session; auto-create if none exist
  useEffect(() => {
    if (loadingSessions || creatingSession) return;
    if (sessions.length > 0 && !activeSessionId) {
      // Only set if it's a valid UUID (not undefined/null)
      const first = sessions[0];
      if (first?.sessionId) setActiveSessionId(first.sessionId);
    } else if (sessions.length === 0 && !activeSessionId) {
      handleNewSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingSessions, sessions.length]);

  async function handleNewSession() {
    const session = await createSession({ contextType: "report", contextId: "global" });
    if (session) setActiveSessionId(session.sessionId);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteSession(deleteTarget, {
      onSuccess: () => {
        if (activeSessionId === deleteTarget) {
          const next = sessions.find((s) => s.sessionId !== deleteTarget);
          setActiveSessionId(next?.sessionId ?? null);
        }
        setDeleteTarget(null);
      },
    });
  }

  // ── Chat state ────────────────────────────────────────────────────────────
  const { data: sessionData, isLoading: loadingMessages } = useAiSessionMessages(activeSessionId);
  const { mutate: sendMessage, isPending: sending } = useAiChatWithSession(activeSessionId);

  // Local messages (optimistic + typewriter)
  const [localMessages, setLocalMessages] = useState<DisplayMessage[]>([]);
  const [typingIndex, setTypingIndex]     = useState<number | null>(null);
  const [input, setInput]                 = useState("");
  const bottomRef                         = useRef<HTMLDivElement>(null);
  const textareaRef                       = useRef<HTMLTextAreaElement>(null);

  // Sync server messages → local when session changes
  useEffect(() => {
    if (sessionData?.messages) {
      setLocalMessages(sessionData.messages.map((m) => ({ ...m })));
      setTypingIndex(null);
    }
  }, [sessionData]);

  // Auto scroll on new messages or typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, sending, typingIndex]);

  // ── Typewriter effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typingIndex === null) return;
    const msg = localMessages[typingIndex];
    if (!msg || !msg.isTyping) return;

    const full = msg.content;
    const displayed = msg.typingText ?? "";
    if (displayed.length >= full.length) {
      // Done — mark as finished
      setLocalMessages((prev) =>
        prev.map((m, i) =>
          i === typingIndex ? { ...m, isTyping: false, typingText: undefined } : m
        )
      );
      setTypingIndex(null);
      return;
    }

    const chunkSize = Math.max(1, Math.ceil(full.length / 120));
    const timer = setTimeout(() => {
      setLocalMessages((prev) =>
        prev.map((m, i) =>
          i === typingIndex
            ? { ...m, typingText: full.slice(0, Math.min(full.length, (m.typingText ?? "").length + chunkSize)) }
            : m
        )
      );
    }, 14);

    return () => clearTimeout(timer);
  }, [localMessages, typingIndex]);

  // ── Socket: real-time ai:reply + session list refresh ────────────────────
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    function onAiReply(data: {
      sessionId: string;
      message: AiMessage;
      provider?: string;
      sessionName?: string;
    }) {
      // Refresh session list sidebar regardless of active session
      qc.invalidateQueries({ queryKey: AI_SESSIONS_KEY("report") });

      // Only animate if this is the active session
      if (data.sessionId !== activeSessionId) return;

      // Update message list from cache (the HTTP response already set it via onSuccess)
      // but kick off typewriter for the AI message if not already animating
      qc.invalidateQueries({ queryKey: aiSessionMessagesKey(data.sessionId) });
    }

    socket.on("ai:reply", onAiReply);
    return () => { socket.off("ai:reply", onAiReply); };
  }, [activeSessionId, accessToken, qc]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending || !activeSessionId) return;
    setInput("");

    // Optimistic user bubble
    const userBubble: DisplayMessage = {
      role: "user", content: msg, createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userBubble]);

    sendMessage(msg, {
      onSuccess: (data) => {
        // Rebuild local messages from server response, last AI message gets typewriter
        const msgs: DisplayMessage[] = data.messages.map((m, i, arr) => {
          if (i === arr.length - 1 && m.role === "assistant") {
            return { ...m, provider: data.provider, isTyping: true, typingText: "" };
          }
          return { ...m };
        });
        setLocalMessages(msgs);
        setTypingIndex(msgs.length - 1);
      },
    });
  }, [input, sending, activeSessionId, sendMessage]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const isEmpty        = localMessages.length === 0 && !loadingMessages;
  const activeSession  = sessions.find((s) => s.sessionId === activeSessionId);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden"
    >
      {/* ── Sessions Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="shrink-0 border-r border-border bg-card/60 overflow-hidden"
          >
            <div className="w-64 h-full">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <BrainCircuit className="h-4 w-4 text-violet-500 shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate">AI Chats</span>
              </div>
              <SessionSidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                isLoading={loadingSessions}
                onSelect={setActiveSessionId}
                onNew={handleNewSession}
                onRename={(id, name) => renameSession({ sessionId: id, sessionName: name })}
                onDelete={(id) => setDeleteTarget(id)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
              title="Toggle chat history"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">
                {activeSession?.sessionName ?? "Carlton AI Agent"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Real-time CRM analytics assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="gap-1 text-xs hidden sm:flex">
              <Zap className="h-3 w-3" />
              {localMessages.length} msgs
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewSession}
              disabled={creatingSession}
              className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
            >
              {creatingSession
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Plus className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline text-xs">New Chat</span>
            </Button>
          </div>
        </div>

        {/* Model status */}
        <div className="px-4 py-2 shrink-0">
          <ModelStatusBar />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!activeSessionId ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20">
                <BrainCircuit className="h-7 w-7 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No chat selected</p>
                <p className="text-xs text-muted-foreground mt-1">Create a new chat or select one from the sidebar</p>
              </div>
              <Button onClick={handleNewSession} disabled={creatingSession} size="sm" className="gap-2">
                {creatingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                New Chat
              </Button>
            </div>
          ) : loadingMessages ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading conversation…
            </div>
          ) : isEmpty ? (
            <EmptyState
              onSuggest={(text) => {
                setInput(text);
                setTimeout(() => handleSend(text), 0);
              }}
            />
          ) : (
            <>
              {localMessages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              <AnimatePresence>
                {sending && typingIndex === null && <TypingDotsIndicator />}
              </AnimatePresence>
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts bar */}
        {activeSessionId && !isEmpty && (
          <div className="px-4 py-2 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {QUICK_PROMPTS.slice(0, 4).map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleSend(p.text)}
                  disabled={sending}
                  className="shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted/60 transition-colors disabled:opacity-50"
                >
                  <span>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className={cn("px-4 py-3 border-t border-border shrink-0", !activeSessionId && "opacity-50 pointer-events-none")}>
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeSessionId ? "Ask anything about your CRM… (Enter to send)" : "Select a chat to start"}
              className="min-h-[48px] max-h-[130px] resize-none rounded-xl border-border bg-card focus-visible:ring-primary/30 text-sm"
              disabled={sending || !activeSessionId}
              rows={1}
            />
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || sending || !activeSessionId}
                size="icon"
                className="h-[48px] w-[48px] rounded-xl shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 border-0 shadow-md"
              >
                {sending
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Send className="h-5 w-5" />
                }
              </Button>
            </motion.div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            AI has access to live lead, team, and performance data
          </p>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages in this conversation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
