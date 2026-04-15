import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from './types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser | null => {
    const req = ctx.switchToHttp().getRequest();
    return (req?.user as JwtUser | undefined) ?? null;
  },
);

