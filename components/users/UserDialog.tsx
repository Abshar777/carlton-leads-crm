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
import { createUserSchema, updateUserSchema, type CreateUserFormValues, type UpdateUserFormValues } from "@/lib/validations/userSchema";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { useRolesSimple } from "@/hooks/useRoles";
import type { User } from "@/types";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const isEditing = !!user;
  const { data: roles = [], isLoading: rolesLoading } = useRolesSimple();
  const { mutate: createUser, isPending: creating } = useCreateUser();
  const { mutate: updateUser, isPending: updating } = useUpdateUser();
  const isPending = creating || updating;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema) as never,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
      designation: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          password: "",
          role: typeof user.role === "object" ? user.role._id : user.role,
          designation: user.designation ?? "",
          status: user.status,
        });
      } else {
        reset({ name: "", email: "", password: "", role: "", designation: "", status: "active" });
      }
    }
  }, [open, user, reset]);

  const onSubmit = (data: CreateUserFormValues) => {
    const payload = { ...data };
    // Remove empty password on update
    if (isEditing && !payload.password) {
      delete (payload as Partial<CreateUserFormValues>).password;
    }

    if (isEditing) {
      updateUser(
        { id: user._id, data: payload as UpdateUserFormValues },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createUser(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="John Doe" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="john@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="password">
                Password {isEditing && <span className="text-muted-foreground font-normal">(leave blank to keep)</span>}
                {!isEditing && "*"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isEditing ? "Leave blank to keep current" : "Min 8 chars, uppercase, number"}
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={rolesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role._id} value={role._id}>
                          {role.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Designation */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" placeholder="e.g. Sales Manager" {...register("designation")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
