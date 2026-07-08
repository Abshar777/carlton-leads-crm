"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Tag, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/useTags";
import type { Tag as ITag } from "@/types/tag";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

interface TagFormState {
  name: string;
  color: string;
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="h-7 w-7 rounded-full border-2 transition-all hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: value === c ? "white" : "transparent",
              boxShadow: value === c ? `0 0 0 2px ${c}` : "none",
            }}
            aria-label={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-full border border-border shrink-0"
          style={{ backgroundColor: value }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-8 font-mono text-xs"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function TagFormDialog({
  open,
  onOpenChange,
  tag,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tag?: ITag | null;
}) {
  const isEditing = !!tag;
  const [form, setForm] = useState<TagFormState>({
    name: tag?.name ?? "",
    color: tag?.color ?? "#3b82f6",
  });
  const { mutate: create, isPending: creating } = useCreateTag();
  const { mutate: update, isPending: updating } = useUpdateTag();
  const isPending = creating || updating;

  function handleOpen(v: boolean) {
    if (v) {
      setForm({ name: tag?.name ?? "", color: tag?.color ?? "#3b82f6" });
    }
    onOpenChange(v);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const hexValid = /^#[0-9A-Fa-f]{6}$/.test(form.color);
    if (!hexValid) return;

    if (isEditing && tag) {
      update(
        { id: tag._id, data: { name: form.name.trim(), color: form.color } },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create(
        { name: form.name.trim(), color: form.color },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpen}>
      <ResponsiveDialogContent desktopClassName="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            {isEditing ? "Edit Tag" : "Create Tag"}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-4 sm:px-0 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Tag Name *</Label>
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: form.color }}
              />
              <Input
                id="tag-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Hot Lead"
                maxLength={50}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !form.name.trim()}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {isEditing ? "Save Changes" : "Create Tag"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function DeleteTagDialog({
  tag,
  open,
  onOpenChange,
}: {
  tag: ITag | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { mutate: deleteTag, isPending } = useDeleteTag();

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete Tag
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="px-4 sm:px-0 py-2">
          <p className="text-sm text-muted-foreground">
            Delete{" "}
            <span className="font-semibold text-foreground">&quot;{tag?.name}&quot;</span>?
            It will be removed from all leads. This cannot be undone.
          </p>
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => tag && deleteTag(tag._id, { onSuccess: () => onOpenChange(false) })}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Delete
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function TagManager() {
  const { data: tags = [], isLoading } = useTags();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTag, setEditTag] = useState<ITag | null>(null);
  const [deleteTag, setDeleteTag] = useState<ITag | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Tags</h3>
          <p className="text-sm text-muted-foreground">
            Create colored tags to categorize and filter leads
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Tag
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tags.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center"
        >
          <Tag className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">No tags yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Create your first tag to start categorizing leads
          </p>
          <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create first tag
          </Button>
        </motion.div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <AnimatePresence>
            {tags.map((tag, i) => (
              <motion.div
                key={tag._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-0 border-border hover:bg-muted/30 transition-colors group"
              >
                <div
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tag.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{tag.color}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditTag(tag)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTag(tag)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <TagFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TagFormDialog open={!!editTag} onOpenChange={(v) => !v && setEditTag(null)} tag={editTag} />
      <DeleteTagDialog tag={deleteTag} open={!!deleteTag} onOpenChange={(v) => !v && setDeleteTag(null)} />
    </div>
  );
}
