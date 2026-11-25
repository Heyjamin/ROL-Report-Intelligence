export type AuthUser = {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  roles: string[];
  permissions: string[];
  isActive?: boolean;
};

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;
