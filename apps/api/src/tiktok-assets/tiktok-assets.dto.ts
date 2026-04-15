import { z } from 'zod';

export const tiktokListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.enum(['profile', 'bc', 'ads_account']).optional(),
  assetType: z.enum(['data', 'runner', 'test']).optional(),
  status: z.enum(['active', 'disabled', 'restricted', 'dead']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type TikTokListQuery = z.infer<typeof tiktokListQuerySchema>;

export const createTikTokAssetSchema = z.object({
  name: z.string().min(1).max(500),
  category: z.enum(['profile', 'bc', 'ads_account']),
  assetType: z.enum(['data', 'runner', 'test']),
  loginEmail: z.string().max(320),
  password: z.string().min(1).max(2000),
  assignedToUserId: z.string().cuid().optional().nullable(),
  status: z.enum(['active', 'disabled', 'restricted', 'dead']),
  spendLimit: z.number().nonnegative().optional().nullable(),
  pixelId: z.string().max(4000).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
});

export type CreateTikTokAssetDto = z.infer<typeof createTikTokAssetSchema>;

export const updateTikTokAssetSchema = createTikTokAssetSchema
  .partial()
  .extend({
    password: z.string().min(1).max(2000).optional(),
  });

export type UpdateTikTokAssetDto = z.infer<typeof updateTikTokAssetSchema>;
