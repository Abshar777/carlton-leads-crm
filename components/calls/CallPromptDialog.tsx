"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneCall, Pencil, XCircle, Coffee, Timer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyCallSession, useRespondToCall, useEndBreak } from "@/hooks/useCallAutomation";

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
      <Dialog open={!!session}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e: Event) => e.preventDefault()}
          onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
        >
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
        </DialogContent>
      </Dialog>
    </>
  );
}
