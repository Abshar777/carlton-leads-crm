"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Calendar, Clock, Wifi, MapPin, Phone, Mail, User, Hash, IndianRupee } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/lead";

const bookingSchema = z.object({
  batch:       z.string().min(1, "Batch is required"),
  time:        z.string().min(1, "Time is required"),
  mode:        z.enum(["online", "offline"]),
  staffName:   z.string().min(1),
  whatsappNo:  z.string().min(1, "WhatsApp number is required"),
  clientName:  z.string().min(1),
  clientEmail: z.string().optional(),
  contactNo:   z.string().min(1),
  amount:      z.coerce.number().min(0).optional(),
  bookingDate: z.string().optional(),
  reminderAt:  z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  currentUserName: string;
  onConfirm: (details: BookingFormValues) => void;
  isPending?: boolean;
}

export function BookingDetailsModal({
  open,
  onOpenChange,
  lead,
  currentUserName,
  onConfirm,
  isPending = false,
}: BookingDetailsModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      batch:       "",
      time:        "",
      mode:        "online",
      staffName:   currentUserName,
      whatsappNo:  "",
      clientName:  lead.name ?? "",
      clientEmail: lead.email ?? "",
      contactNo:   lead.phone ?? "",
      amount:      undefined,
      bookingDate: "",
      reminderAt:  "",
    },
  });

  const mode = watch("mode");

  function onSubmit(values: BookingFormValues) {
    const payload: BookingFormValues = { ...values };
    if (values.reminderAt) {
      // Convert datetime-local (IST) → ISO string with +05:30 offset
      payload.reminderAt = new Date(`${values.reminderAt}:00+05:30`).toISOString();
    }
    onConfirm(payload);
  }

  function handleClose() {
    if (!isPending) {
      reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15">
              <Calendar className="h-4 w-4 text-teal-400" />
            </span>
            Booking Details
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fill in the booking details to confirm this lead as Booking.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Mode toggle */}
          <div className="space-y-1.5">
            <Label>Mode *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["online", "offline"] as const).map((m) => (
                <motion.button
                  key={m}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setValue("mode", m)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
                    mode === m
                      ? m === "online"
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : "border-orange-500/50 bg-orange-500/10 text-orange-400"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {m === "online" ? <Wifi className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Batch */}
          <div className="space-y-1.5">
            <Label htmlFor="batch" className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              Batch *
            </Label>
            <Input id="batch" placeholder="e.g. Batch 12, Morning Batch" {...register("batch")} />
            {errors.batch && <p className="text-xs text-destructive">{errors.batch.message}</p>}
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label htmlFor="time" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Time *
            </Label>
            <Input id="time" placeholder="e.g. 10:00 AM, 6:00 PM - 8:00 PM" {...register("time")} />
            {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
          </div>

          {/* WhatsApp No */}
          <div className="space-y-1.5">
            <Label htmlFor="whatsappNo" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              WhatsApp No *
            </Label>
            <Input id="whatsappNo" placeholder="+91 9876543210" {...register("whatsappNo")} />
            {errors.whatsappNo && <p className="text-xs text-destructive">{errors.whatsappNo.message}</p>}
          </div>

          {/* Amount + Booking Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                Booking Amount
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                placeholder="e.g. 5000"
                {...register("amount")}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bookingDate" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Booking Date
              </Label>
              <Input
                id="bookingDate"
                type="date"
                {...register("bookingDate")}
              />
            </div>
          </div>

          <div className="border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Client Details</p>
            <div className="space-y-3">
              {/* Staff Name */}
              <div className="space-y-1.5">
                <Label htmlFor="staffName" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Staff Name *
                </Label>
                <Input id="staffName" placeholder="Staff name" {...register("staffName")} />
                {errors.staffName && <p className="text-xs text-destructive">{errors.staffName.message}</p>}
              </div>

              {/* Client Name */}
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Client Name *
                </Label>
                <Input id="clientName" placeholder="Client full name" {...register("clientName")} />
                {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Client Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="clientEmail" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email
                    <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </Label>
                  <Input id="clientEmail" placeholder="email@example.com" {...register("clientEmail")} className="text-xs" />
                </div>

                {/* Contact No */}
                <div className="space-y-1.5">
                  <Label htmlFor="contactNo" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Contact No *
                  </Label>
                  <Input id="contactNo" placeholder="Phone number" {...register("contactNo")} className="text-xs" />
                  {errors.contactNo && <p className="text-xs text-destructive">{errors.contactNo.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div className="border-t border-border/40 pt-3 space-y-1.5">
            <Label htmlFor="reminderAt" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Reminder Date & Time
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Input
              id="reminderAt"
              type="datetime-local"
              {...register("reminderAt")}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              A reminder will be created automatically for this booking.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
