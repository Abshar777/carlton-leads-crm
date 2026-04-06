"use client";
import { useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createLeadSchema,
  updateLeadSchema,
  type CreateLeadFormValues,
  type UpdateLeadFormValues,
} from "@/lib/validations/leadSchema";
import { useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { useAllCourses } from "@/hooks/useCourses";
import { useTeams, useTeam } from "@/hooks/useTeams";
import type { Lead } from "@/types/lead";

const SOURCES = [
  { value: "website",  label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social",   label: "Social Media" },
  { value: "direct",   label: "Direct" },
  { value: "other",    label: "Other" },
];

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  mode?: "create" | "edit";
}

export function LeadDialog({ open, onOpenChange, lead, mode }: LeadDialogProps) {
  const isEditing = mode === "edit" || !!lead;

  const { mutate: createLead, isPending: creating } = useCreateLead();
  const { mutate: updateLead, isPending: updating } = useUpdateLead();
  const { data: allCourses = [] } = useAllCourses();
  // All active teams for the Team dropdown
  const { data: teamsData } = useTeams({ status: "active", limit: 100 });
  const teams = teamsData?.data ?? [];

  const isPending = creating || updating;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(isEditing ? updateLeadSchema : createLeadSchema) as never,
    defaultValues: { name: "", email: "", phone: "", source: "", course: "", team: "", assignedTo: "" },
  });

  // Watch team field to fetch its members
  const selectedTeamId = useWatch({ control, name: "team" as never }) as string | undefined;
  const { data: selectedTeam } = useTeam(selectedTeamId ?? "");

  // Build members list from selected team (leaders + members, deduped)
  const teamMembers = useMemo(() => {
    if (!selectedTeam) return [];
    const all = [
      ...(selectedTeam.leaders ?? []).map((u: { _id: string; name: string }) => ({ _id: u._id, name: u.name, role: "Leader" })),
      ...(selectedTeam.members ?? []).map((u: { _id: string; name: string }) => ({ _id: u._id, name: u.name, role: "Member" })),
    ];
    // dedupe by _id
    const seen = new Set<string>();
    return all.filter((u) => { if (seen.has(u._id)) return false; seen.add(u._id); return true; });
  }, [selectedTeam]);

  // When team changes, clear assignedTo so user picks a relevant person
  useEffect(() => {
    setValue("assignedTo" as never, "" as never);
  }, [selectedTeamId, setValue]);

  useEffect(() => {
    if (open) {
      if (lead) {
        reset({
          name:   lead.name,
          email:  lead.email ?? "",
          phone:  lead.phone ?? "",
          source: lead.source ?? "",
          course: (typeof lead.course === "object" && lead.course !== null)
            ? (lead.course as { _id: string })._id
            : (lead.course as string | null | undefined) ?? "",
        } as UpdateLeadFormValues as never);
      } else {
        reset({ name: "", email: "", phone: "", source: "", course: "", team: "", assignedTo: "" });
      }
    }
  }, [open, lead, reset]);

  const onSubmit = (data: CreateLeadFormValues) => {
    const payload = {
      ...data,
      email:      data.email      || undefined,
      source:     data.source     || undefined,
      course:     data.course     || undefined,
      team:       (data as CreateLeadFormValues).team       || undefined,
      assignedTo: (data as CreateLeadFormValues).assignedTo || undefined,
    };

    if (isEditing && lead) {
      updateLead({ id: lead._id, data: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createLead(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? "Edit Lead" : "Create New Lead"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4 px-4 sm:px-0">
          <div className="grid grid-cols-2 gap-4">

            {/* Name */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="lead-name">Full Name *</Label>
              <Input id="lead-name" placeholder="John Doe" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" placeholder="john@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone *</Label>
              <Input id="lead-phone" placeholder="+91 98765 43210" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Course */}
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Controller
                name="course"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {allCourses.map((c) => (
                        <SelectItem key={c._id} value={c._id || ""}>{c.name || ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* ── Create-only fields ─────────────────────────────────────── */}
            {!isEditing && (
              <>
                {/* Team */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Team <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Controller
                    name={"team" as never}
                    control={control}
                    render={({ field }: { field: { value: string; onChange: (v: string) => void } }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((t) => (
                            <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Assigned To — members from selected team */}
                <div className="col-span-2 space-y-1.5">
                  <Label>
                    Assign To{" "}
                    <span className="text-muted-foreground text-xs">
                      {selectedTeamId ? "(team members)" : "(defaults to you)"}
                    </span>
                  </Label>
                  <Controller
                    name={"assignedTo" as never}
                    control={control}
                    render={({ field }: { field: { value: string; onChange: (v: string) => void } }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={!selectedTeamId}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              selectedTeamId
                                ? teamMembers.length > 0
                                  ? "Select member"
                                  : "No members in team"
                                : "Select a team first"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((m) => (
                            <SelectItem key={m._id} value={m._id}>
                              {m.name}
                              <span className="ml-1.5 text-xs text-muted-foreground">({m.role})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {!selectedTeamId && (
                    <p className="text-xs text-muted-foreground">
                      Leave blank to auto-assign to yourself.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {isEditing ? "Save Changes" : "Create Lead"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export default LeadDialog;
