import type { UserRole } from '@prisma/client';

export type JwtUser = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
};

