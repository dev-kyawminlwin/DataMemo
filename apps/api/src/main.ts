import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

// Nest does not load .env by default. Monorepo `npm run dev:api` often runs with cwd at repo root,
// so resolve apps/api/.env relative to this file first, then common fallbacks.
const envCandidates = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(process.cwd(), 'apps', 'api', '.env'),
  path.resolve(process.cwd(), '.env'),
];
let loadedEnv = false;
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    loadedEnv = true;
    break;
  }
}
if (!loadedEnv) {
  config();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prisma = app.get(PrismaService);
  prisma.enableShutdownHooks(app);

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}
bootstrap();
