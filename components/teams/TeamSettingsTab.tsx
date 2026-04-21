"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Shuffle, Users, CheckCircle2, Loader2, RefreshCw, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTeamSettings, useUpdateTeamSettings } from "@/hooks/useTeams";
import type { Team } from "@/types/team";
import type { User } from "@/types";

interface Props {
  teamId: string;
  team: Team;
  isLeaderOrAdmin: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export function TeamSettingsTab({ teamId, team, isLeaderOrAdmin }: Props) {
  const { data: settings, isLoading } = useTeamSettings(teamId);
  const { mutate: save, isPending: saving } = useUpdateTeamSettings(teamId);

  const [autoAssign, setAutoAssign]       = useState(false);
  const [splitMode, setSplitMode]         = useState<"round_robin" | "equal_load">("round_robin");
  const [includedMembers, setIncluded]    = useState<string[]>([]);

  // All members pool (leaders + members, deduped)
  const allMembers: User[] = [
    ...(team.leaders ?? []),
    ...(team.members ?? []).filter((m) => !(team.leaders ?? []).some((l) => l._id === m._id)),
  ];

  useEffect(() => {
    if (!settings) return;
    setAutoAssign(settings.autoAssign ?? false);
    setSplitMode(settings.splitMode ?? "round_robin");
    setIncluded(settings.includedMembers ?? []);
  }, [settings]);

  function toggleMember(id: string) {
    setIncluded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleSave() {
    save({ autoAssign, splitMode, includedMembers });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const effectivePool = includedMembers.length > 0
    ? allMembers.filter((m) => includedMembers.includes(m._id))
    : allMembers.filter((m) => !team.inactiveMembers.includes(m._id));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5 max-w-2xl">

      {/* Auto-assign toggle */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              Lead Assignment Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Auto-Split Leads</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, new leads assigned to this team are automatically distributed to members
                </p>
              </div>
              <Switch
                checked={autoAssign}
                onCheckedChange={isLeaderOrAdmin ? setAutoAssign : undefined}
                disabled={!isLeaderOrAdmin}
              />
            </div>

            {!autoAssign && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  Manual mode — leaders and admins assign leads to members from the unassigned pool.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Algorithm — only shown when auto is on */}
      {autoAssign && (
        <motion.div variants={itemVariants}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <Shuffle className="h-4 w-4 text-violet-400" />
                </div>
                Distribution Algorithm
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "round_robin" as const,
                  label: "Round Robin",
                  description: "Members take turns receiving leads in rotation",
                  color: "primary",
                },
                {
                  id: "equal_load" as const,
                  label: "Equal Load",
                  description: "New lead always goes to the member with fewest active leads",
                  color: "teal",
                },
              ].map((opt) => {
                const active = splitMode === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => isLeaderOrAdmin && setSplitMode(opt.id)}
                    disabled={!isLeaderOrAdmin}
                    className={[
                      "text-left rounded-xl border p-4 transition-all",
                      active
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/50 hover:border-border hover:bg-muted/20",
                      !isLeaderOrAdmin ? "cursor-default opacity-70" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                      {active && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </motion.button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Member inclusion — only shown when auto is on */}
      {autoAssign && (
        <motion.div variants={itemVariants}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                Participating Members
                <Badge variant="secondary" className="ml-auto text-xs font-normal">
                  {effectivePool.length} active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select specific members to receive auto-split leads. Leave all unselected to include every active member.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allMembers.map((member) => {
                  const selected = includedMembers.includes(member._id);
                  const isInactive = team.inactiveMembers.includes(member._id);
                  return (
                    <motion.button
                      key={member._id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => isLeaderOrAdmin && toggleMember(member._id)}
                      disabled={!isLeaderOrAdmin}
                      className={[
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        selected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40 hover:border-border hover:bg-muted/20",
                        !isLeaderOrAdmin ? "cursor-default" : "cursor-pointer",
                      ].join(" ")}
                    >
                      <div className={[
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                      ].join(" ")}>
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                        {isInactive && (
                          <span className="text-[10px] text-amber-400">Inactive for auto-assign</span>
                        )}
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current round-robin position indicator */}
      {autoAssign && splitMode === "round_robin" && settings && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Next lead goes to:{" "}
              <span className="font-medium text-foreground">
                {effectivePool.length > 0
                  ? (effectivePool[(settings.roundRobinIndex ?? 0) % effectivePool.length]?.name ?? "—")
                  : "No eligible members"}
              </span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Save */}
      {isLeaderOrAdmin && (
        <motion.div variants={itemVariants}>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Settings
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
