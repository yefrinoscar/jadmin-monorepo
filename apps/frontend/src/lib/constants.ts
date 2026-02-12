export const USER_ROLES = {
  ADMIN: "admin",
  TECHNICIAN: "technician",
  CLIENT: "client",
  SUPERADMIN: "superadmin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_COLORS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: "bg-red-100 text-red-700 hover:bg-red-100/80",
  [USER_ROLES.TECHNICIAN]: "bg-blue-100 text-blue-700 hover:bg-blue-100/80",
  [USER_ROLES.CLIENT]: "bg-green-100 text-green-700 hover:bg-green-100/80",
  [USER_ROLES.SUPERADMIN]: "bg-purple-100 text-purple-700 hover:bg-purple-100/80",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: "Administrador",
  [USER_ROLES.TECHNICIAN]: "Técnico",
  [USER_ROLES.CLIENT]: "Cliente",
  [USER_ROLES.SUPERADMIN]: "Super Admin",
};
