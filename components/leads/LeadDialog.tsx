"use client";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createLeadSchema, updateLeadSchema, type CreateLeadFormValues } from "@/lib/validations/leadSchema";
import { useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { useAllCourses } from "@/hooks/useCourses";
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
  const isPending = creating || updating;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(isEditing ? updateLeadSchema : createLeadSchema) as never,
    defaultValues: { name: "", email: "", phone: "", source: "", course: "" },
  });

  useEffect(() => {
    if (open) {
      if (lead) {
        reset({
          name: lead.name,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          source: lead.source ?? "",
          course: (typeof lead.course === "object" && lead.course !== null)
            ? (lead.course as { _id: string })._id
            : (lead.course as string | null | undefined) ?? "",
        });
      } else {
        reset({ name: "", email: "", phone: "", source: "", course: "" });
      }
    }
  }, [open, lead, reset]);

  const onSubmit = (data: CreateLeadFormValues) => {
    const payload = {
      ...data,
      email: data.email || undefined,
      source: data.source || undefined,
      course: data.course || undefined,
    };

    if (isEditing && lead) {
      updateLead({ id: lead._id, data: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createLead(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Lead" : "Create New Lead"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="lead-name">Full Name *</Label>
              <Input id="lead-name" placeholder="John Doe" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email Address</Label>
              <Input id="lead-email" type="email" placeholder="john@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone *</Label>
              <Input id="lead-phone" placeholder="+1 234 567 8900" {...register("phone")} />
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* <SelectItem key="none" value="none">None</SelectItem> */}
                      {allCourses.map((c) => (
                        <SelectItem key={c._id} value={c._id || ""}>{c.name || ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {isEditing ? "Save Changes" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LeadDialog;
