import { ForbiddenException } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export function assertFacebookRead(role: UserRole): void {
  if (role === 'finance') {
    throw new ForbiddenException('Finance role cannot access Facebook assets');
  }
}

export function assertFacebookWrite(role: UserRole): void {
  assertFacebookRead(role);
  if (role !== 'super_admin' && role !== 'admin') {
    throw new ForbiddenException(
      'Only admins can create or modify Facebook assets',
    );
  }
}

export function canRevealFacebookPassword(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}
