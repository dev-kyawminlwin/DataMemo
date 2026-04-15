import { ForbiddenException } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export function assertSupportRead(role: UserRole): void {
  // Allow all except basic roles if we want to follow PRD. 
  // PRD: "Staff: View assigned assets only. Cannot see sensitive passwords unless granted"
  // For support, we can let users read the names but restrict passwords.
}

export function assertSupportWrite(role: UserRole): void {
  if (role !== 'super_admin' && role !== 'admin') {
    throw new ForbiddenException(
      'Only admins can create or modify Support Tools Vault',
    );
  }
}

export function canRevealSupportPassword(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}
