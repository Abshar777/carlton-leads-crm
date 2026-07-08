"use client";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tag, ChevronDown, Search, Check } from "lucide-react";
import { useTags } from "@/hooks/useTags";
import { TagBadge } from "./TagBadge";

interface TagSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TagSelector({ value, onChange, placeholder = "Add tags…", disabled }: TagSelectorProps) {
  const { data: tags = [] } = useTags();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTags = tags.filter((t) => value.includes(t._id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-9 w-full items-center gap-1.5 flex-wrap rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <AnimatePresence>
          {selectedTags.length === 0 ? (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          ) : (
            selectedTags.map((tag) => (
              <TagBadge
                key={tag._id}
                tag={tag}
                size="xs"
                onRemove={() => toggle(tag._id)}
              />
            ))
          )}
        </AnimatePresence>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full rounded-md border border-border bg-popover shadow-lg"
          >
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tags…"
                  className="w-full rounded-sm border border-input bg-background pl-8 pr-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">No tags found</p>
              ) : (
                filtered.map((tag) => {
                  const selected = value.includes(tag._id);
                  return (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => toggle(tag._id)}
                      className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full shrink-0 border"
                        style={{ backgroundColor: tag.color, borderColor: tag.color }}
                      />
                      <span className="flex-1 text-left text-xs">{tag.name}</span>
                      {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
