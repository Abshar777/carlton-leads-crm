"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, RefreshCw, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, AlertTriangle, CloudUpload,
  HardDrive, Loader2, MessageCircle, Wifi, WifiOff, QrCode,
  Smartphone, Tag, GitFork,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useBackupManifest, useTriggerBackup, useRestoreBackup,
  type ManifestEntry, type RestoreResult,
} from "@/hooks/useBackup";
import {
  useWAStatus, useConnectWA, useDisconnectWA,
} from "@/hooks/useWhatsApp";
import { useAuthStore } from "@/lib/store/authStore";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { WA_STATUS_KEY } from "@/hooks/useWhatsApp";
import { TagManager } from "@/components/tags/TagManager";
import { Switch } from "@/components/ui/switch";
import { useAppSettings, useUpdateAppSettings } from "@/hooks/useAppSettings";

function TagManagerInline() {
  return (
    <Card>
      <CardContent className="pt-6">
        <TagManager />
      </CardContent>
    </Card>
  );
}

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const listContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const listItemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

// ─── Restore Dialog ───────────────────────────────────────────────────────────

function RestoreDialog({
  entry, onClose, onConfirm, isPending, results,
}: {
  entry: ManifestEntry | null; onClose: () => void; onConfirm: () => void;
  isPending: boolean; results: RestoreResult[] | null;
}) {
  return (
    <Dialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />Restore Backup
          </DialogTitle>
          <DialogDescription>
            This will <strong>delete and replace</strong> all data in the selected collections.
          </DialogDescription>
        </DialogHeader>
        {!results ? (
          <>
            {entry && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Backup time</span><span className="font-medium">{entry.timestampIST}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Collections</span><span className="font-medium">{entry.collections.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total records</span><span className="font-medium">{entry.totalRecords.toLocaleString()}</span></div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.collections.map((c) => <Badge key={c.name} variant="secondary" className="text-xs">{c.name} ({c.count})</Badge>)}
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>All current data in these collections will be permanently overwritten.</span>
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {results.map((r) => (
              <div key={r.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{r.name}</span>
                <div className="flex items-center gap-2">
                  {r.status === "ok"
                    ? <><span className="text-muted-foreground">{r.count} records</span><CheckCircle2 className="h-4 w-4 text-green-500" /></>
                    : <><span className="text-xs text-destructive">{r.error}</span><XCircle className="h-4 w-4 text-destructive" /></>
                  }
                </div>
              </div>
            ))}
          </motion.div>
        )}
        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button variant="destructive" onClick={onConfirm} disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Restoring…" : "Restore Now"}
              </Button>
            </>
          ) : (
            <Button onClick={onClose} className="w-full">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Backup Row ───────────────────────────────────────────────────────────────

function BackupRow({ entry, onRestore }: { entry: ManifestEntry; index: number; onRestore: (e: ManifestEntry) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div variants={listItemVariants} className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{entry.timestampIST}</p>
            <p className="text-xs text-muted-foreground">{entry.collections.length} collections · {entry.totalRecords.toLocaleString()} records</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs hidden sm:flex items-center gap-1">
            <Clock className="h-3 w-3" />{formatRelative(entry.timestamp)}
          </Badge>
          <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400"
            onClick={(e) => { e.stopPropagation(); onRestore(entry); }}>
            <RotateCcw className="h-3.5 w-3.5" />Restore
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-border">
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {entry.collections.map((c) => <Badge key={c.name} variant="secondary" className="text-xs">{c.name}: {c.count}</Badge>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── WhatsApp Settings Tab ────────────────────────────────────────────────────

function WhatsAppTab() {
  const { accessToken } = useAuthStore.getState();
  const qc = useQueryClient();
  const { data: waData, isLoading: statusLoading, refetch } = useWAStatus();
  const { mutate: connectWA,    isPending: connecting }    = useConnectWA();
  const { mutate: disconnectWA, isPending: disconnecting } = useDisconnectWA();

  const status   = waData?.status   ?? "disconnected";
  const phone    = waData?.phone    ?? "";
  const qrImage  = waData?.qrImage  ?? "";

  // Listen for real-time QR + status updates
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    socket.on("whatsapp:status", () => {
      qc.invalidateQueries({ queryKey: WA_STATUS_KEY });
    });

    return () => { socket.off("whatsapp:status"); };
  }, [accessToken, qc]);

  const statusColors: Record<string, string> = {
    connected:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    qr_ready:     "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    connecting:   "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    disconnected: "border-destructive/30 bg-destructive/10 text-destructive",
  };

  const statusLabels: Record<string, string> = {
    connected:    "Connected",
    qr_ready:     "Scan QR Code",
    connecting:   "Connecting…",
    disconnected: "Disconnected",
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            WhatsApp Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={cn("gap-1.5 px-3 py-1 text-sm", statusColors[status])}>
              {status === "connected" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {statusLabels[status]}
              {status === "connected" && phone && <span className="font-normal opacity-80">· +{phone}</span>}
            </Badge>
            <button onClick={() => refetch()} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={cn("h-4 w-4", statusLoading && "animate-spin")} />
            </button>
          </div>

          {/* QR Code display */}
          <AnimatePresence>
            {(status === "qr_ready" || status === "connecting") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                {status === "connecting" && !qrImage ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Generating QR code…</p>
                  </div>
                ) : qrImage ? (
                  <>
                    <div className="rounded-2xl border-4 border-emerald-500/30 bg-white p-3 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImage} alt="WhatsApp QR Code" className="h-48 w-48" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">Scan with WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        Open WhatsApp → Linked Devices → Link a Device → Scan this QR
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <Smartphone className="h-3.5 w-3.5 shrink-0" />
                      QR expires in ~60s — page auto-refreshes
                    </div>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connected info */}
          {status === "connected" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
              <p className="font-medium text-foreground">✅ WhatsApp is active</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Incoming messages automatically create leads. Agents can reply from any lead's detail page.
              </p>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {status === "disconnected" && (
              <Button onClick={() => connectWA()} disabled={connecting} className="gap-2 bg-emerald-500 hover:bg-emerald-600 border-0">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {connecting ? "Starting…" : "Connect WhatsApp"}
              </Button>
            )}
            {status === "connected" && (
              <Button variant="outline" onClick={() => disconnectWA()} disabled={disconnecting}
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-medium">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {[
            ["1", "Click Connect → scan the QR with your WhatsApp Business app"],
            ["2", "Session is saved — no re-scan needed after server restart"],
            ["3", "Customer sends a message → auto-creates a lead (source: WhatsApp)"],
            ["4", "Agents reply directly from the lead detail page"],
            ["5", "All conversations are stored in MongoDB per lead"],
          ].map(([n, text]) => (
            <div key={n} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{n}</span>
              <span>{text}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Workflow Settings Tab ────────────────────────────────────────────────────

function WorkflowTab() {
  const { data, isLoading } = useAppSettings();
  const { mutate, isPending } = useUpdateAppSettings();

  const enabled = data?.workflowEnabled ?? false;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitFork className="h-5 w-5 text-primary" />
            Lead Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            When enabled, leads automatically move through teams based on status changes.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Enable Workflow</p>
              <p className="text-xs text-muted-foreground">
                {enabled ? "Workflow is active — leads will auto-transfer between teams." : "Workflow is off — teams work independently."}
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={enabled}
                disabled={isPending}
                onCheckedChange={(val) => mutate({ workflowEnabled: val })}
              />
            )}
          </div>

          {/* Flow diagram */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How it works</p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {[
                {
                  step: "1",
                  color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  label: "Booking Team",
                  desc: "Receives all leads. When a lead status changes to Booking, it auto-transfers to the Closing Team and disappears from Booking Team.",
                },
                {
                  step: "2",
                  color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                  label: "Closing Team",
                  desc: "Closes the lead (status → Closed). Booking team can still view the lead history.",
                },
                {
                  step: "3",
                  color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  label: "Redeposit Team (Redep)",
                  desc: "Gets shared read+write access when lead is Closed. Both Closing and Redep teams can update the same lead.",
                },
              ].map(({ step, color, label, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}>
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Teams are identified by their tag name — create tags named <strong>Booking</strong>, <strong>Closing</strong>, and <strong>Redep</strong> and assign them to the respective teams.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = (user as { role?: { roleName?: string } })?.role?.roleName === "Super Admin";

  const [activeTab, setActiveTab] = useState<"whatsapp" | "backup" | "tags" | "workflow">("whatsapp");

  const { data: manifest, isLoading, refetch } = useBackupManifest();
  const { mutate: triggerBackup, isPending: triggering } = useTriggerBackup();
  const { mutate: restoreBackup, isPending: restoring, data: restoreResults } = useRestoreBackup();

  const [restoreTarget, setRestoreTarget] = useState<ManifestEntry | null>(null);
  const [showResults, setShowResults]     = useState(false);

  const backups = manifest?.backups ?? [];
  const sorted  = [...backups].reverse();

  function handleRestore(entry: ManifestEntry) { setShowResults(false); setRestoreTarget(entry); }
  function handleConfirmRestore() {
    if (!restoreTarget) return;
    restoreBackup(restoreTarget.id, { onSuccess: () => setShowResults(true) });
  }
  function handleCloseDialog() { setRestoreTarget(null); setShowResults(false); }

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">WhatsApp integration and data backups</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {([
          { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
          { key: "backup",   label: "Backup & Restore", icon: Database },
          { key: "tags",     label: "Tags", icon: Tag },
          { key: "workflow", label: "Workflow", icon: GitFork },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === key
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence>
        {activeTab === "workflow" && (
          <motion.div key="workflow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WorkflowTab />
          </motion.div>
        )}
        {activeTab === "tags" && (
          <motion.div key="tags" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <TagManagerInline />
          </motion.div>
        )}
        {activeTab === "whatsapp" && (
          <motion.div key="whatsapp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WhatsAppTab />
          </motion.div>
        )}
        {activeTab === "backup" && (
          <motion.div key="backup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Run Backup Now */}
            {isSuperAdmin && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CloudUpload className="h-5 w-5 text-primary" />Run Backup Now
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Exports all collections to JSON and sends to Telegram. Auto-runs at <strong>2:00 AM</strong> and <strong>2:00 PM</strong> IST.
                  </p>
                  <Button onClick={() => triggerBackup()} disabled={triggering} className="gap-2">
                    {triggering ? <><Loader2 className="h-4 w-4 animate-spin" />Starting…</> : <><Database className="h-4 w-4" />Run Backup Now</>}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Backup History */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-5 w-5 text-primary" />Backup History
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {backups.length > 0 && <Badge variant="secondary">{backups.length} backups</Badge>}
                    <button onClick={() => refetch()} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                      <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/60 animate-pulse" />)}</div>
                ) : sorted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Database className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No backups yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Run a backup to see history here</p>
                  </div>
                ) : (
                  <motion.div variants={listContainerVariants} initial="hidden" animate="visible" className="space-y-2">
                    {sorted.map((entry, i) => (
                      <BackupRow key={entry.id} entry={entry} index={i}
                        onRestore={isSuperAdmin ? handleRestore : () => {}} />
                    ))}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <RestoreDialog
        entry={restoreTarget} onClose={handleCloseDialog}
        onConfirm={handleConfirmRestore} isPending={restoring}
        results={showResults ? (restoreResults ?? null) : null}
      />
    </motion.div>
  );
}
