// ─── Permissions ──────────────────────────────────────────────────────────────
export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export";

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export const CRM_MODULES = [
  "dashboard",
  "users",
  "roles",
  "leads",
  "queue",
  "impersonate",
  "teams",
  "courses",
  "reminders",
  "reports",
  "settings",
  "ai-agent",
  "whatsapp"
] as const;

export type CrmModule = (typeof CRM_MODULES)[number];

export const MODULE_LABELS: Record<CrmModule, string> = {
  dashboard: "Dashboard",
  users: "Users",
  roles: "Roles & Permissions",
  leads: "Leads",
  queue: "My Queue",
  impersonate: "Impersonate Users",
  teams: "Teams",
  courses: "Courses",
  reminders: "Reminders",
  reports: "Reports",
  settings: "Settings",
  "ai-agent": "AI Agent",
  "whatsapp": "WhatsApp",
};

export type PermissionsMap = Partial<Record<CrmModule, ModulePermissions>>;

// ─── Role ─────────────────────────────────────────────────────────────────────
export interface Role {
  _id: string;
  roleName: string;
  description?: string;
  permissions: PermissionsMap;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RoleSimple = Pick<Role, "_id" | "roleName" | "description" | "isSystemRole">;

// ─── User ─────────────────────────────────────────────────────────────────────
/** Days in display order, Sunday first, matching the schedule editor. */
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = typeof DAY_KEYS[number];

/** off = weekly off · full = full day · half = half day */
export type DayMode = "off" | "full" | "half";
export const DAY_MODES: DayMode[] = ["off", "full", "half"];

export const DAY_LABELS: Record<DayKey, string> = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
};

/** A named, reusable work schedule managed under Settings. */
export interface WorkSchedule {
  _id: string;
  name: string;
  description?: string;
  loginTime: string;
  logoutTime: string;
  breakStart?: string;
  breakEnd?: string;
  /** When set, "half" days end here instead of logoutTime. */
  halfDayLogoutTime?: string;
  workDays: Record<DayKey, DayMode>;
  graceMinutes: number;
  isActive: boolean;
  /** How many users this schedule is assigned to — returned by the list endpoint. */
  assignedCount?: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role | string;
  designation?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  workSchedule?: WorkSchedule | string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  designation?: string;
  status: "active" | "inactive";
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}
