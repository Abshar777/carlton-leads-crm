"use client";

/**
 * ResponsiveDialog
 * ─────────────────────────────────────────────────────────────────────────────
 * On mobile (< 640 px)  → renders a bottom-sheet Drawer (vaul / shadcn Drawer)
 * On desktop (≥ 640 px) → renders a centred Dialog
 *
 * Drop-in replacement for Dialog. Just swap:
 *   <Dialog>           → <ResponsiveDialog>
 *   <DialogContent>    → <ResponsiveDialogContent>
 *   <DialogHeader>     → <ResponsiveDialogHeader>
 *   <DialogTitle>      → <ResponsiveDialogTitle>
 *   <DialogDescription>→ <ResponsiveDialogDescription>
 *   <DialogFooter>     → <ResponsiveDialogFooter>
 */

import * as React from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

// ─── Root ─────────────────────────────────────────────────────────────────────

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

interface ResponsiveDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Extra className forwarded to DialogContent only (desktop) */
  className?: string;
  /** Max-width class applied on desktop, e.g. "max-w-lg" */
  desktopClassName?: string;
}

export function ResponsiveDialogContent({
  children,
  className,
  desktopClassName,
  ...props
}: ResponsiveDialogContentProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerContent className="max-h-[92dvh] overflow-y-auto px-0 pb-6">
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent
      className={[desktopClassName ?? "max-w-lg", className].filter(Boolean).join(" ")}
      {...(props as React.ComponentPropsWithoutRef<typeof DialogContent>)}
    >
      {children}
    </DialogContent>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function ResponsiveDialogHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerHeader className={["text-left px-4", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </DrawerHeader>
    );
  }

  return (
    <DialogHeader className={className} {...props}>
      {children}
    </DialogHeader>
  );
}

// ─── Title ────────────────────────────────────────────────────────────────────

export function ResponsiveDialogTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerTitle className={className} {...(props as React.ComponentPropsWithoutRef<typeof DrawerTitle>)}>
        {children}
      </DrawerTitle>
    );
  }

  return (
    <DialogTitle className={className} {...(props as React.ComponentPropsWithoutRef<typeof DialogTitle>)}>
      {children}
    </DialogTitle>
  );
}

// ─── Description ─────────────────────────────────────────────────────────────

export function ResponsiveDialogDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerDescription className={className} {...(props as React.ComponentPropsWithoutRef<typeof DrawerDescription>)}>
        {children}
      </DrawerDescription>
    );
  }

  return (
    <DialogDescription className={className} {...(props as React.ComponentPropsWithoutRef<typeof DialogDescription>)}>
      {children}
    </DialogDescription>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function ResponsiveDialogFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerFooter className={["flex-row justify-end px-4", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </DrawerFooter>
    );
  }

  return (
    <DialogFooter className={className} {...props}>
      {children}
    </DialogFooter>
  );
}
