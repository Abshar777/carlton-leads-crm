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
/** One day of a work schedule. Times are "HH:mm", read as IST. */
export interface WorkDay {
  /** false = weekly off; the other fields are ignored */
  enabled: boolean;
  loginTime?: string;
  breakStart?: string;
  breakEnd?: string;
  logoutTime?: string;
}

export const WORK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WorkDayKey = typeof WORK_DAYS[number];
export const WORK_DAY_LABELS: Record<WorkDayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export type WorkSchedule = Record<WorkDayKey, WorkDay>;

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role | string;
  designation?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  workSchedule?: WorkSchedule | null;
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
