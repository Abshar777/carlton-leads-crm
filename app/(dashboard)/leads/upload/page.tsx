"use client";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, Download, ChevronDown, ChevronUp,
  ArrowLeft, CheckCircle2, XCircle, Loader2, AlertCircle,
  UsersRound, Check, X, CheckSquare, Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { uploadLeadSchema, type UploadLeadFormValues } from "@/lib/validations/leadSchema";
import { useUploadLeads } from "@/hooks/useLeads";
import { useTeams } from "@/hooks/useTeams";
import type { UploadLeadsResult, InvalidRow } from "@/types/lead";
import type { Team } from "@/types/team";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = ["Name", "Email", "Phone", "Source", "Notes"];
  const sample = ["John Doe", "john@example.com", "+1234567890", "website", "Interested in product A"];
  const csvContent = [headers.join(","), sample.join(",")].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Result Summary ────────────────────────────────────────────────────────────

function ResultSummary({ result }: { result: UploadLeadsResult }) {
  const [invalidExpanded, setInvalidExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-400" />
        <h3 className="font-semibold text-foreground">Upload Complete</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Processed", value: result.total,    color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
          { label: "Leads Created",   value: result.created,  color: "bg-green-500/10 border-green-500/20 text-green-400" },
          { label: "Invalid Rows",    value: result.invalid,  color: result.invalid > 0 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-muted/30 border-border text-muted-foreground" },
          { label: "Auto Assigned",   value: result.assigned, color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
          >
            <div className={`rounded-lg border p-4 ${stat.color}`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs mt-0.5 opacity-80">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {result.assigned > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground"
        >
          {result.assigned} leads auto-assigned across selected teams
        </motion.p>
      )}

      {result.invalid > 0 && result.invalidDetails.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border border-red-500/20 bg-red-500/5 overflow-hidden"
        >
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-red-400"
            onClick={() => setInvalidExpanded(!invalidExpanded)}
          >
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {result.invalid} invalid row{result.invalid !== 1 ? "s" : ""} — click to review
            </div>
            {invalidExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <AnimatePresence>
            {invalidExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto border-t border-red-500/20">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-500/10 text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">Row</th>
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Email</th>
                        <th className="px-4 py-2 text-left font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-500/10">
                      {result.invalidDetails.map((row: InvalidRow) => (
                        <tr key={row.row} className="hover:bg-red-500/5">
                          <td className="px-4 py-2 font-mono">{row.row}</td>
                          <td className="px-4 py-2">{(row.data.name as string) ?? "—"}</td>
                          <td className="px-4 py-2">{(row.data.email as string) ?? "—"}</td>
                          <td className="px-4 py-2 text-red-400">{row.errors.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Team Selector ─────────────────────────────────────────────────────────────

interface TeamSelectorProps {
  teams: Team[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function TeamSelector({ teams, selectedIds, onToggle, onSelectAll, onDeselectAll }: TeamSelectorProps) {
  const allSelected = teams.length > 0 && selectedIds.size === teams.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size === 0
              ? "No teams selected — leads won't be auto-assigned"
              : selectedIds.size === teams.length
                ? "All teams selected"
                : `${selectedIds.size} of ${teams.length} teams selected`}
          </span>
          {noneSelected && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400"
            >
              <AlertCircle className="h-3 w-3" />
              No auto-assign
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onSelectAll}
            disabled={allSelected}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
            All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onDeselectAll}
            disabled={noneSelected}
          >
            <Square className="h-3.5 w-3.5 mr-1.5" />
            None
          </Button>
        </div>
      </div>

      {/* Team tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {teams.map((team, i) => {
            const isSelected = selectedIds.has(team._id);
            const memberCount = (team.members?.length ?? 0) + (team.leaders?.length ?? 0);
            return (
              <motion.button
                key={team._id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onToggle(team._id)}
                className={`relative flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150
                  ${isSelected
                    ? "border-primary/40 bg-primary/8 ring-1 ring-primary/20"
                    : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
                  }
                `}
              >
                {/* Check indicator */}
                <div className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors
                  ${isSelected ? "bg-primary border-primary" : "border-border bg-background"}
                `}>
                  {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {team.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {memberCount} member{memberCount !== 1 ? "s" : ""}
                    {team.leadStats?.thisMonth != null && (
                      <span className="ml-1.5 text-violet-400/80">· {team.leadStats.thisMonth} this mo.</span>
                    )}
                  </p>
                </div>

                {/* Selected glow */}
                {isSelected && (
                  <motion.div
                    layoutId={`team-glow-${team._id}`}
                    className="absolute inset-0 rounded-xl ring-1 ring-primary/20 pointer-events-none"
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function UploadLeadsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadLeadsResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [teamsInitialised, setTeamsInitialised] = useState(false);

  const { mutate: uploadLeads, isPending } = useUploadLeads();
  const { data: teamsData, isLoading: teamsLoading } = useTeams({ status: "active", limit: 100 });
  const activeTeams = teamsData?.data ?? [];

  // Pre-select all teams once they load
  useEffect(() => {
    if (!teamsInitialised && activeTeams.length > 0) {
      setSelectedTeamIds(new Set(activeTeams.map((t) => t._id)));
      setTeamsInitialised(true);
    }
  }, [activeTeams, teamsInitialised]);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UploadLeadFormValues>({
    resolver: zodResolver(uploadLeadSchema),
  });

  const fileList = watch("file");
  const hasFile = fileList && fileList.length > 0;

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setValue("file", files, { shouldValidate: true });
    setSelectedFileName(files[0].name);
    setUploadResult(null);
  };

  const handleToggleTeam = (id: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => setSelectedTeamIds(new Set(activeTeams.map((t) => t._id)));
  const handleDeselectAll = () => setSelectedTeamIds(new Set());

  const onSubmit = (data: UploadLeadFormValues) => {
    const file = data.file[0];
    const teamIds = Array.from(selectedTeamIds);
    uploadLeads(
      { file, teamIds: teamIds.length > 0 ? teamIds : [] },
      {
        onSuccess: (result) => {
          setUploadResult(result);
          setSelectedFileName("");
          setValue("file", undefined as unknown as FileList);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.push("/leads")} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Upload Leads</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Bulk import leads from an Excel or CSV file
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        {/* Template download */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Download Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Download the CSV template to see the required format. Supported columns:{" "}
              {["Name", "Email", "Phone", "Source", "Notes"].map((c) => (
                <span key={c} className="font-mono text-xs bg-muted px-1 py-0.5 rounded mr-1">{c}</span>
              ))}
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Download Sample CSV
            </Button>
          </CardContent>
        </Card>

        {/* Team Selection */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-primary" />
                  Auto-Assign Teams
                </CardTitle>
                {!teamsLoading && activeTeams.length > 0 && (
                  <Badge
                    variant="secondary"
                    className={`text-xs tabular-nums transition-colors ${
                      selectedTeamIds.size === 0
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {selectedTeamIds.size}/{activeTeams.length} selected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Uploaded leads will be auto-distributed only across the selected teams. Deselect a team to exclude it.
              </p>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading teams…
                </div>
              ) : activeTeams.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  No active teams found. Leads will be uploaded without auto-assignment.
                </div>
              ) : (
                <TeamSelector
                  teams={activeTeams}
                  selectedIds={selectedTeamIds}
                  onToggle={handleToggleTeam}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upload form */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Upload File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileChange(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                  cursor-pointer transition-all duration-200 py-12 px-6 text-center
                  ${dragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : hasFile
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                />

                <AnimatePresence mode="wait">
                  {hasFile ? (
                    <motion.div
                      key="selected"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                        <FileSpreadsheet className="h-6 w-6 text-green-400" />
                      </div>
                      <p className="font-medium text-sm text-foreground">{selectedFileName}</p>
                      <p className="text-xs text-muted-foreground">Click to change file</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <Upload className={`h-6 w-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {dragOver ? "Drop file here" : "Drag & drop or click to browse"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {errors.file && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.file.message as string}
                </div>
              )}

              {/* Selected teams summary pill */}
              <AnimatePresence>
                {activeTeams.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors
                      ${selectedTeamIds.size === 0
                        ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                        : "border-primary/15 bg-primary/5 text-primary"
                      }`}
                  >
                    <UsersRound className="h-3.5 w-3.5 shrink-0" />
                    {selectedTeamIds.size === 0
                      ? "No teams selected — leads will be uploaded but NOT auto-assigned"
                      : selectedTeamIds.size === activeTeams.length
                        ? `Auto-assigning across all ${activeTeams.length} teams`
                        : `Auto-assigning to ${selectedTeamIds.size} selected team${selectedTeamIds.size !== 1 ? "s" : ""}`
                    }
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3">
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="submit"
                    disabled={isPending || !hasFile}
                    className="gap-2"
                  >
                    {isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
                    ) : (
                      <><Upload className="h-4 w-4" />Upload & Import</>
                    )}
                  </Button>
                </motion.div>
                {hasFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFileName("");
                      setValue("file", undefined as unknown as FileList);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      setUploadResult(null);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence>
          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <Card className="border-green-500/20">
                <CardContent className="pt-6">
                  <ResultSummary result={uploadResult} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        <Card className="border-border/30 bg-muted/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground text-sm">Import Notes</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>The <strong>Name</strong> column is required; all other columns are optional.</li>
                  <li>Duplicate emails will be skipped.</li>
                  <li>Select specific teams above to control which teams receive the auto-assigned leads.</li>
                  <li>Deselecting all teams will upload leads without auto-assignment.</li>
                  <li>Maximum 500 rows per upload.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
