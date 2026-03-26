"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  Zap,
  FileText,
  UsersRound,
  BookOpen,
  BarChart2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/store/uiStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/store/authStore";
import { toast } from "sonner";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permModule: "dashboard" },
  { href: "/leads", label: "Leads", icon: FileText, permModule: "leads" },
  { href: "/teams", label: "Teams", icon: UsersRound, permModule: "leads" },
  { href: "/courses", label: "Courses", icon: BookOpen, permModule: "leads" },
  { href: "/reports", label: "Reports", icon: BarChart2, permModule: "reports" },
  { href: "/users", label: "Users", icon: Users, permModule: "users" },
  { href: "/roles", label: "Roles & Permissions", icon: Shield, permModule: "roles" },
];

// ─── Shared nav link list (used in both desktop + mobile) ────────────────────

interface NavLinksProps {
  collapsed?: boolean;      // desktop-only concept
  onNavigate?: () => void;  // called after clicking a link (mobile: close drawer)
}

function NavLinks({ collapsed = false, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuthStore();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
      {navItems.map(({ href, label, icon: Icon, permModule }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const allowed = hasPermission(permModule ?? href.split("/")[1], "view");

        const linkEl = (
          <Link
            href={href}
            onClick={(e) => {
              if (!allowed) {
                e.preventDefault();
                toast.error("You don't have permission to access this page");
                return;
              }
              onNavigate?.();
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              !allowed && "opacity-50 cursor-not-allowed hidden",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {/* Desktop collapsed: label hidden; mobile / expanded: always show */}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        );

        return (
          <Tooltip key={href}>
            <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
            {/* Only show tooltip when desktop sidebar is collapsed */}
            {collapsed && (
              <TooltipContent side="right">{label}</TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </nav>
  );
}

// ─── Logo block (shared) ──────────────────────────────────────────────────────

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4 shrink-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
        <Zap className="h-5 w-5 text-primary-foreground" />
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">
              Carlton CRM
            </p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">Phase 4</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUiStore();

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative hidden md:flex h-full flex-col border-r border-sidebar-border bg-sidebar overflow-hidden"
      >
        <Logo collapsed={sidebarCollapsed} />

        <NavLinks collapsed={sidebarCollapsed} />

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2 shrink-0">
          <button
            onClick={toggleSidebarCollapsed}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer() {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useUiStore();

  return (
    <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
      <SheetContent
        side="left"
        className="w-72 p-0 flex flex-col bg-sidebar border-r border-sidebar-border"
        hideClose
      >
        {/* Accessible title (visually hidden by SheetHeader sr-only) */}
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>

        {/* Logo row + close button */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground">Carlton CRM</p>
              <p className="text-xs text-muted-foreground">Phase 4</p>
            </div>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links — close drawer after navigating */}
        <TooltipProvider delayDuration={0}>
          <NavLinks onNavigate={() => setMobileDrawerOpen(false)} />
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}

// ─── Combined export ──────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileDrawer />
    </>
  );
}
