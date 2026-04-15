import { Module } from '@nestjs/common';

import { TikTokAssetsController } from './tiktok-assets.controller';
import { TikTokAssetsService } from './tiktok-assets.service';

@Module({
  controllers: [TikTokAssetsController],
  providers: [TikTokAssetsService],
  exports: [TikTokAssetsService],
})
export class TiktokAssetsModule {}
