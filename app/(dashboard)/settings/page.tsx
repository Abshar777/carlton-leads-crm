"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, RefreshCw, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, AlertTriangle, CloudUpload,
  HardDrive, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useBackupManifest,
  useTriggerBackup,
  useRestoreBackup,
  type ManifestEntry,
  type RestoreResult,
} from "@/hooks/useBackup";
import { useAuthStore } from "@/lib/store/authStore";

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

interface RestoreDialogProps {
  entry:    ManifestEntry | null;
  onClose:  () => void;
  onConfirm: () => void;
  isPending: boolean;
  results:  RestoreResult[] | null;
}

function RestoreDialog({ entry, onClose, onConfirm, isPending, results }: RestoreDialogProps) {
  const open = !!entry;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Restore Backup
          </DialogTitle>
          <DialogDescription>
            This will <strong>delete and replace</strong> all data in the selected collections.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <>
            {entry && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Backup time</span>
                  <span className="font-medium">{entry.timestampIST}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Collections</span>
                  <span className="font-medium">{entry.collections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total records</span>
                  <span className="font-medium">{entry.totalRecords.toLocaleString()}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {entry.collections.map((c) => (
                    <Badge key={c.name} variant="secondary" className="text-xs">
                      {c.name} ({c.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>All current data in these collections will be permanently overwritten.</span>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {results.map((r) => (
              <div key={r.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{r.name}</span>
                <div className="flex items-center gap-2">
                  {r.status === "ok" ? (
                    <>
                      <span className="text-muted-foreground">{r.count} records</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-destructive">{r.error}</span>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={isPending}
                className="gap-2"
              >
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

interface BackupRowProps {
  entry:     ManifestEntry;
  index:     number;
  onRestore: (entry: ManifestEntry) => void;
}

function BackupRow({ entry, onRestore }: BackupRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={listItemVariants}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{entry.timestampIST}</p>
            <p className="text-xs text-muted-foreground">
              {entry.collections.length} collections · {entry.totalRecords.toLocaleString()} records
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs hidden sm:flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelative(entry.timestamp)}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400"
            onClick={(e) => { e.stopPropagation(); onRestore(entry); }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
          </Button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {entry.collections.map((c) => (
                <Badge key={c.name} variant="secondary" className="text-xs">
                  {c.name}: {c.count}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = (user as { role?: { roleName?: string } })?.role?.roleName === "Super Admin";

  const { data: manifest, isLoading, refetch } = useBackupManifest();
  const { mutate: triggerBackup, isPending: triggering } = useTriggerBackup();
  const { mutate: restoreBackup, isPending: restoring, data: restoreResults } = useRestoreBackup();

  const [restoreTarget, setRestoreTarget] = useState<ManifestEntry | null>(null);
  const [showResults, setShowResults] = useState(false);

  const backups = manifest?.backups ?? [];
  const sorted  = [...backups].reverse();

  function handleRestore(entry: ManifestEntry) {
    setShowResults(false);
    setRestoreTarget(entry);
  }

  function handleConfirmRestore() {
    if (!restoreTarget) return;
    restoreBackup(restoreTarget.id, {
      onSuccess: () => setShowResults(true),
    });
  }

  function handleCloseDialog() {
    setRestoreTarget(null);
    setShowResults(false);
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage backups and data recovery</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Backup Card */}
      {isSuperAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudUpload className="h-5 w-5 text-primary" />
              Run Backup Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Exports all collections to JSON and sends them to the Telegram backup channel.
              Backups also run automatically at <strong>2:00 AM</strong> and <strong>2:00 PM</strong> IST.
            </p>
            <Button
              onClick={() => triggerBackup()}
              disabled={triggering}
              className="gap-2"
            >
              {triggering ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Starting backup…</>
              ) : (
                <><Database className="h-4 w-4" /> Run Backup Now</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Backup History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-5 w-5 text-primary" />
              Backup History
            </CardTitle>
            {backups.length > 0 && (
              <Badge variant="secondary">{backups.length} backups</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/60 animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No backups yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run a backup to see history here
              </p>
            </div>
          ) : (
            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {sorted.map((entry, i) => (
                <BackupRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onRestore={isSuperAdmin ? handleRestore : () => {}}
                />
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <RestoreDialog
        entry={restoreTarget}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmRestore}
        isPending={restoring}
        results={showResults ? (restoreResults ?? null) : null}
      />
    </motion.div>
  );
}
