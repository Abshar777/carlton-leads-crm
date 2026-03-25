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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/store/uiStore";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/store/authStore";
import { toast } from "sonner";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permModule: "dashboard" },
  { href: "/leads",     label: "Leads",               icon: FileText,      permModule: "leads" },
  { href: "/teams",     label: "Teams",               icon: UsersRound,    permModule: "leads" },
  { href: "/courses",   label: "Courses",             icon: BookOpen,      permModule: "leads" },
  { href: "/users",     label: "Users",               icon: Users,         permModule: "users" },
  { href: "/roles",     label: "Roles & Permissions", icon: Shield,        permModule: "roles" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUiStore();
  const {hasPermission}=useAuthStore()

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative flex h-full flex-col border-r border-sidebar-border bg-sidebar overflow-hidden"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
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
                <p className="text-xs text-muted-foreground whitespace-nowrap">Phase 2</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon, permModule }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    {...(!hasPermission(permModule ?? href.split("/")[1], "view") && {
                      disabled: true,
                      onClick: (e) => {
                        e.preventDefault();
                        toast.error("You don't have permission to access this page");
                      },
                      className: "opacity-50 cursor-not-allowed",
                    })}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-sidebar-border p-2">
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
