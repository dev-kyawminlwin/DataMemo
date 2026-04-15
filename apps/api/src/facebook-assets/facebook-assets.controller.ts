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
  createFacebookAssetSchema,
  facebookListQuerySchema,
  type CreateFacebookAssetDto,
  updateFacebookAssetSchema,
  type UpdateFacebookAssetDto,
} from './facebook-assets.dto';
import { FacebookAssetsService } from './facebook-assets.service';

@Controller('facebook-assets')
@UseGuards(JwtAuthGuard)
export class FacebookAssetsController {
  constructor(private readonly facebookAssets: FacebookAssetsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtUser,
    @Query() raw: Record<string, string | string[] | undefined>,
  ) {
    const parsed = facebookListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid query',
        issues: parsed.error.issues,
      });
    }
    return this.facebookAssets.list(user, parsed.data);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query('revealPassword') revealPassword?: string,
  ) {
    return this.facebookAssets.getById(user, id, revealPassword === 'true');
  }

  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body(new ZodValidationPipe(createFacebookAssetSchema))
    body: CreateFacebookAssetDto,
    @Req() req: Request,
  ) {
    return this.facebookAssets.create(user, body, req);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFacebookAssetSchema))
    body: UpdateFacebookAssetDto,
    @Req() req: Request,
  ) {
    return this.facebookAssets.update(user, id, body, req);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.facebookAssets.remove(user, id, req);
  }
}
