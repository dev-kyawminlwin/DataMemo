import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { JwtUser } from '../auth/types';
import {
  createSupportAccountSchema,
  supportListQuerySchema,
  type CreateSupportAccountDto,
  updateSupportAccountSchema,
  type UpdateSupportAccountDto,
} from './support.dto';
import { SupportService } from './support.service';

@Controller('support-tools')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(
    @CurrentUser() user: JwtUser,
    @Query() raw: Record<string, string | string[] | undefined>,
  ) {
    const parsed = supportListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid query',
        issues: parsed.error.issues,
      });
    }
    return this.support.list(user, parsed.data);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query('revealPassword') revealPassword?: string,
  ) {
    return this.support.getById(user, id, revealPassword === 'true');
  }

  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(createSupportAccountSchema))
    body: CreateSupportAccountDto,
    @Req() req: Request,
  ) {
    return this.support.create(user, body, req);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSupportAccountSchema))
    body: UpdateSupportAccountDto,
    @Req() req: Request,
  ) {
    return this.support.update(user, id, body, req);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.support.remove(user, id, req);
  }
}
