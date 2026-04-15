import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { CredentialsModule } from './credentials/credentials.module';
import { FacebookAssetsModule } from './facebook-assets/facebook-assets.module';
import { TiktokAssetsModule } from './tiktok-assets/tiktok-assets.module';
import { FinanceModule } from './finance/finance.module';
import { SupportModule } from './support-tools/support.module';

@Module({
  imports: [
    PrismaModule,
    CredentialsModule,
    AuthModule,
    HealthModule,
    FacebookAssetsModule,
    TiktokAssetsModule,
    FinanceModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
