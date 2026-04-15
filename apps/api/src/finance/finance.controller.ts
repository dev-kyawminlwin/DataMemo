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
  createFinanceTransactionSchema,
  financeListQuerySchema,
  type CreateFinanceTransactionDto,
  updateFinanceTransactionSchema,
  type UpdateFinanceTransactionDto,
} from './finance.dto';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('dashboard')
  getDashboardStats(@CurrentUser() user: JwtUser) {
    return this.finance.getDashboardStats(user);
  }

  @Get()
  list(
    @CurrentUser() user: JwtUser,
    @Query() raw: Record<string, string | string[] | undefined>,
  ) {
    const parsed = financeListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid query',
        issues: parsed.error.issues,
      });
    }
    return this.finance.list(user, parsed.data);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.finance.getById(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(createFinanceTransactionSchema))
    body: CreateFinanceTransactionDto,
    @Req() req: Request,
  ) {
    return this.finance.create(user, body, req);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFinanceTransactionSchema))
    body: UpdateFinanceTransactionDto,
    @Req() req: Request,
  ) {
    return this.finance.update(user, id, body, req);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.finance.remove(user, id, req);
  }
}
