import { motion } from "framer-motion";
import type { Tag } from "@/types/tag";

interface TagBadgeProps {
  tag: Tag | { _id: string; name: string; color: string };
  onRemove?: () => void;
  size?: "sm" | "xs";
}

export function TagBadge({ tag, onRemove, size = "sm" }: TagBadgeProps) {
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${padding}`}
      style={{
        backgroundColor: `${tag.color}20`,
        borderColor: `${tag.color}50`,
        color: tag.color,
      }}
    >
      <span
        className="inline-block rounded-full shrink-0"
        style={{ width: size === "xs" ? 5 : 6, height: size === "xs" ? 5 : 6, backgroundColor: tag.color }}
      />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
          aria-label={`Remove ${tag.name}`}
        >
          ×
        </button>
      )}
    </motion.span>
  );
}
