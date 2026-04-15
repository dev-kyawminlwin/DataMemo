import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

@Controller('health')
export class HealthController {
  @Get()
  ok() {
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  session(@CurrentUser() user: JwtUser) {
    return { authenticated: true, email: user.email, role: user.role };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('super-admin')
  superAdminOnly() {
    return { ok: true, scope: 'super_admin' };
  }
}
