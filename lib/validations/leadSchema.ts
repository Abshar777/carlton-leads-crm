import { z } from "zod";

const PHONE_RE = /^(\+)?[\d\s\-().]{7,20}$/;

// Base fields shared by create + update
const baseLeadFields = z.object({
  name:   z.string().min(1, "Name is required").max(100, "Name too long"),
  email:  z.string().email("Invalid email address").optional().or(z.literal("")),
  phone:  z.string().min(1, "Phone is required").max(20, "Phone too long")
            .regex(PHONE_RE, "Enter digits only — e.g. 9876543210 or +919876543210"),
  source: z.string().optional(),
  course: z.string().optional().nullable(),
});

// Create — adds optional team + assignedTo
export const createLeadSchema = baseLeadFields.extend({
  team:       z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
});

// Edit — all fields optional, no team/assignedTo (managed via separate endpoints)
export const updateLeadSchema = baseLeadFields.partial();

export const uploadLeadSchema = z.object({
  file: z
    .custom<FileList>((v) => v instanceof FileList && v.length > 0, "File is required")
    .refine(
      (files) => {
        const file = files[0];
        if (!file) return false;
        const name = file.name.toLowerCase();
        return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
      },
      "File must be .xlsx, .xls, or .csv"
    ),
});

export type CreateLeadFormValues = z.infer<typeof createLeadSchema>;
export type UpdateLeadFormValues = z.infer<typeof updateLeadSchema>;
export type UploadLeadFormValues = z.infer<typeof uploadLeadSchema>;
