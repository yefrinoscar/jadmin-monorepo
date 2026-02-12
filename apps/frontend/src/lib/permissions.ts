import { USER_ROLES, type UserRole } from "./constants";

export const PERMISSIONS = {
  create: {
    user: [USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN],
  },
  read: {
    user: [USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN],
  },
  update: {
    user: [USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN],
  },
  delete: {
    user: [USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN],
  },
} as const;

export function hasPermission(role: UserRole, action: keyof typeof PERMISSIONS, resource: keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]): boolean {
  if (role === USER_ROLES.SUPERADMIN) return true;
  const allowedRoles = PERMISSIONS[action][resource] as readonly UserRole[];
  return allowedRoles.includes(role);
}
