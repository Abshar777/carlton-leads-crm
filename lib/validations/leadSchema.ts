import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone is required").max(20, "Phone too long"),
  source: z.string().optional(),
  course: z.string().optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial();

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
