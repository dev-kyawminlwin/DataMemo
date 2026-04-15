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
  createTikTokAssetSchema,
  tiktokListQuerySchema,
  type CreateTikTokAssetDto,
  updateTikTokAssetSchema,
  type UpdateTikTokAssetDto,
} from './tiktok-assets.dto';
import { TikTokAssetsService } from './tiktok-assets.service';

@Controller('tiktok-assets')
@UseGuards(JwtAuthGuard)
export class TikTokAssetsController {
  constructor(private readonly tiktokAssets: TikTokAssetsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtUser,
    @Query() raw: Record<string, string | string[] | undefined>,
  ) {
    const parsed = tiktokListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid query',
        issues: parsed.error.issues,
      });
    }
    return this.tiktokAssets.list(user, parsed.data);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query('revealPassword') revealPassword?: string,
  ) {
    return this.tiktokAssets.getById(user, id, revealPassword === 'true');
  }

  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(createTikTokAssetSchema))
    body: CreateTikTokAssetDto,
    @Req() req: Request,
  ) {
    return this.tiktokAssets.create(user, body, req);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTikTokAssetSchema))
    body: UpdateTikTokAssetDto,
    @Req() req: Request,
  ) {
    return this.tiktokAssets.update(user, id, body, req);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.tiktokAssets.remove(user, id, req);
  }
}
