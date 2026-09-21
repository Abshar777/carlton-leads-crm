"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneCall, Pencil, XCircle, Coffee, Timer, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useMyCallSession, useRespondToCall, useEndBreak,
  useSubmitCallOutcome, useSkipCallOutcome,
  useConfirmBreakReturn, useExtendBreak,
  CALL_RESULTS, type CallResult, type BreakReturnState,
} from "@/hooks/useCallAutomation";

/**
 * Asked once a break has run out: are they actually back?
 *
 * The timer is the point — a popup left sitting here is a late return, and it
 * is the same number the admin page reports.
 */
function BreakReturnPrompt({ state }: { state: BreakReturnState }) {
  const { mutate: confirm, isPending } = useConfirmBreakReturn();
  const { mutate: extend, isPending: extending } = useExtendBreak();
  const [waiting, setWaiting] = useState(0);
  const [extendMode, setExtendMode] = useState(false);
  const [minutes, setMinutes] = useState(10);

  const since = state.breakReturnPromptedAt ?? state.breakEndsAt;
  useEffect(() => {
    if (!since) { setWaiting(0); return; }
    const tick = () => setWaiting(Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [since]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between gap-3 pr-6">
          <span className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-amber-400" /> Break is over
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-normal tabular-nums text-muted-foreground">
            <Timer className="h-3 w-3" /> {mmss(waiting)}
          </span>
        </DialogTitle>
      </DialogHeader>

      <p className="text-sm text-muted-foreground">
        Are you back? Calls stay paused until you answer, and how long this sits here is recorded.
        {state.breakExtensions > 0 && (
          <span className="mt-1 block text-xs text-amber-400">
            Extended {state.breakExtensions} time{state.breakExtensions === 1 ? "" : "s"} already.
          </span>
        )}
      </p>

      <AnimatePresence mode="wait">
        {extendMode ? (
          <motion.div key="extend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Label>Extend by how long?</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} max={120} value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))} className="w-24" />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setExtendMode(false)}>Back</Button>
              <Button size="sm" disabled={extending || minutes < 1} onClick={() => extend({ minutes })}>
                {extending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Extend"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-2">
            <Button className="gap-1.5" disabled={isPending} onClick={() => confirm()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} I&apos;m back
            </Button>
            <Button variant="outline" className="gap-1.5" disabled={extending} onClick={() => setExtendMode(true)}>
              <Coffee className="h-4 w-4" /> Still on break
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * The write-up owed after a call.
 *
 * It opens when they come back to the app — the point of "Call Next" is that
 * they leave for the dialler — or after a short grace period if they never
 * left, which is what happens on a desktop where tel: does nothing.
 */
function CallOutcomeForm({
  session,
}: {
  session: NonNullable<ReturnType<typeof useMyCallSession>["data"]>["pendingOutcome"];
}) {
  const { mutate: submit, isPending } = useSubmitCallOutcome();
  const { mutate: skip, isPending: skipping } = useSkipCallOutcome();

  const [result, setResult] = useState<CallResult | "">("");
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(0);
  const [note, setNote] = useState("");
  const [skipping_, setSkipMode] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const startedAt = session?.callStartedAt;

  // Prefill the duration with however long they were away — they can correct it.
  useEffect(() => {
    if (!startedAt) return;
    const elapsed = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    setMins(Math.floor(elapsed / 60));
    setSecs(elapsed % 60);
  }, [startedAt]);

  if (!session) return null;

  const lead = session.lead ?? null;
  const complete = !!result && note.trim().length > 0;

  const save = () =>
    submit({
      sessionId: session._id,
      callResult: result as CallResult,
      durationSeconds: Math.max(0, mins) * 60 + Math.max(0, Math.min(59, secs)),
      note: note.trim(),
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pr-6">
          <ClipboardList className="h-4 w-4 text-primary" /> Call details
        </DialogTitle>
      </DialogHeader>

      {lead && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="font-semibold">{lead.name}</p>
          <p className="font-mono text-sm text-muted-foreground">{lead.phone ?? "no number"}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {skipping_ ? (
          <motion.div key="skip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Label>Why can&apos;t you fill this in? *</Label>
            <Textarea rows={3} autoFocus value={skipReason} onChange={(e) => setSkipReason(e.target.value)}
              placeholder="e.g. call did not go through, filling it in later…" />
            <p className="text-xs text-muted-foreground">This is recorded and shown to your admin.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSkipMode(false)}>Back</Button>
              <Button size="sm" disabled={!skipReason.trim() || skipping}
                onClick={() => skip({ sessionId: session._id, reason: skipReason.trim() })}>
                {skipping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Call status *</Label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as CallResult)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Select…</option>
                {CALL_RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Duration *</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={mins} onChange={(e) => setMins(Number(e.target.value))}
                  className="w-20" aria-label="Minutes" />
                <span className="text-sm text-muted-foreground">min</span>
                <Input type="number" min={0} max={59} value={secs} onChange={(e) => setSecs(Number(e.target.value))}
                  className="w-20" aria-label="Seconds" />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
              <p className="text-xs text-muted-foreground">Timed for you &mdash; correct it if it&apos;s wrong.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Notes *</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="What was discussed, what happens next…" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setSkipMode(true)}>
                Can&apos;t fill this in
              </Button>
              <Button size="sm" disabled={!complete || isPending} onClick={save}>
                {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save details
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function CallPromptDialog() {
  const router = useRouter();
  const { data } = useMyCallSession();
  const { mutate: respond, isPending } = useRespondToCall();
  const { mutate: endBreak, isPending: ending } = useEndBreak();

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [held, setHeld] = useState(0);
  const [breakMins, setBreakMins] = useState(0);

  const session = data?.session ?? null;
  const pendingOutcome = data?.pendingOutcome ?? null;
  const breakReturn = data?.breakReturn ?? null;
  const lead = session?.lead ?? null;
  const promptedAt = session?.promptedAt;
  const breakEnds = data?.breakEndsAt ?? null;

  // How long they have been holding the prompt — shown live, and the same
  // number the admin page reports as holdSeconds.
  useEffect(() => {
    if (!promptedAt) { setHeld(0); return; }
    const tick = () => setHeld(Math.max(0, Math.round((Date.now() - new Date(promptedAt).getTime()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [promptedAt]);

  useEffect(() => {
    if (!breakEnds) { setBreakMins(0); return; }
    const tick = () => setBreakMins(Math.max(0, Math.ceil((new Date(breakEnds).getTime() - Date.now()) / 60_000)));
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, [breakEnds]);

  // "Call Next" sends them to the dialler, so the write-up waits until they are
  // back in the app. If they never actually left — a desktop where tel: does
  // nothing — a short grace period asks anyway rather than waiting forever.
  const [outcomeDue, setOutcomeDue] = useState(false);
  useEffect(() => {
    if (!pendingOutcome) { setOutcomeDue(false); return; }

    const ask = () => setOutcomeDue(true);
    const onVisible = () => { if (document.visibilityState === "visible") ask(); };

    // Only count a *return*: if the tab is visible right now, wait for it to be
    // hidden and come back, or for the grace period to run out.
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", ask);
    const grace = setTimeout(ask, 45_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", ask);
      clearTimeout(grace);
    };
  }, [pendingOutcome?._id]);

  const close = () => { setRejecting(false); setReason(""); };

  const act = (action: "called" | "updated" | "break") => {
    if (!session) return;
    respond({ sessionId: session._id, action }, {
      onSuccess: () => {
        close();
        // Both Call and Update open the lead; only Call dials.
        if (lead && (action === "called" || action === "updated")) {
          if (action === "called" && lead.phone) window.location.href = `tel:${lead.phone}`;
          router.push(`/leads/${lead._id}`);
        }
      },
    });
  };

  const submitReject = () => {
    if (!session || !reason.trim()) return;
    respond({ sessionId: session._id, action: "rejected", rejectReason: reason.trim() }, { onSuccess: close });
  };

  const onBreak = !!breakEnds && new Date(breakEnds).getTime() > Date.now();

  return (
    <>
      <AnimatePresence>
        {onBreak && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 shadow-lg backdrop-blur"
          >
            <Coffee className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-amber-200">On break &mdash; {breakMins} min left</span>
            <Button size="sm" variant="outline" className="h-7" disabled={ending} onClick={() => endBreak()}>
              {ending ? <Loader2 className="h-3 w-3 animate-spin" /> : "I'm back"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answered, not dismissed — closing it just re-opens while the session is live. */}
      <Dialog open={!!breakReturn || !!session || (!!pendingOutcome && outcomeDue)}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e: Event) => e.preventDefault()}
          onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
        >
          {breakReturn ? (
            <BreakReturnPrompt state={breakReturn} />
          ) : pendingOutcome && outcomeDue ? (
            <CallOutcomeForm session={pendingOutcome} />
          ) : (
          <>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary" /> Next call
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-normal text-muted-foreground tabular-nums">
                <Timer className="h-3 w-3" /> {mmss(held)}
              </span>
            </DialogTitle>
          </DialogHeader>

          {lead && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="font-semibold">{lead.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{lead.phone ?? "no number"}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground/70">{lead.status}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {rejecting ? (
              <motion.div key="reject" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                <Label>Why are you not calling? *</Label>
                <Textarea rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. number switched off, asked to call later…" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRejecting(false)}>Back</Button>
                  <Button size="sm" disabled={!reason.trim() || isPending} onClick={submitReject}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-2">
                <Button className="gap-1.5" disabled={isPending} onClick={() => act("called")}>
                  <PhoneCall className="h-4 w-4" /> Call Next
                </Button>
                <Button variant="outline" className="gap-1.5" disabled={isPending} onClick={() => act("updated")}>
                  <Pencil className="h-4 w-4" /> Update Lead
                </Button>
                <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={isPending} onClick={() => setRejecting(true)}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button variant="outline" className="gap-1.5" disabled={isPending} onClick={() => act("break")}>
                  <Coffee className="h-4 w-4" /> Break
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
