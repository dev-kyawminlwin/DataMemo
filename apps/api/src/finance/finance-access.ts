import { ForbiddenException } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export function assertFinanceAccess(role: UserRole): void {
  if (role === 'staff') {
    throw new ForbiddenException('Staff role cannot access Finance tracking');
  }
}

export function assertFinanceWrite(role: UserRole): void {
  assertFinanceAccess(role);
}
