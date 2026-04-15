import { ForbiddenException } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export function assertTikTokRead(role: UserRole): void {
  if (role === 'finance') {
    throw new ForbiddenException('Finance role cannot access TikTok assets');
  }
}

export function assertTikTokWrite(role: UserRole): void {
  assertTikTokRead(role);
  if (role !== 'super_admin' && role !== 'admin') {
    throw new ForbiddenException(
      'Only admins can create or modify TikTok assets',
    );
  }
}

export function canRevealTikTokPassword(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}
