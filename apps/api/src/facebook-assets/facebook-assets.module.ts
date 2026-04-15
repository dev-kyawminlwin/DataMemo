import { Module } from '@nestjs/common';

import { FacebookAssetsController } from './facebook-assets.controller';
import { FacebookAssetsService } from './facebook-assets.service';

@Module({
  controllers: [FacebookAssetsController],
  providers: [FacebookAssetsService],
  exports: [FacebookAssetsService],
})
export class FacebookAssetsModule {}
