import { z } from 'zod';

export const facebookListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.enum(['profile', 'bm', 'page', 'ads_account']).optional(),
  assetType: z.enum(['data', 'runner', 'test']).optional(),
  status: z.enum(['active', 'disabled', 'restricted', 'dead']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type FacebookListQuery = z.infer<typeof facebookListQuerySchema>;

export const createFacebookAssetSchema = z.object({
  name: z.string().min(1).max(500),
  category: z.enum(['profile', 'bm', 'page', 'ads_account']),
  assetType: z.enum(['data', 'runner', 'test']),
  loginEmail: z.string().email().max(320),
  password: z.string().min(1).max(2000),
  twoFaRecoveryInfo: z.string().max(4000).optional().nullable(),
  assignedToUserId: z.string().cuid().optional().nullable(),
  status: z.enum(['active', 'disabled', 'restricted', 'dead']),
  spendLimit: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
});

export type CreateFacebookAssetDto = z.infer<typeof createFacebookAssetSchema>;

export const updateFacebookAssetSchema = createFacebookAssetSchema
  .partial()
  .extend({
    password: z.string().min(1).max(2000).optional(),
  });

export type UpdateFacebookAssetDto = z.infer<typeof updateFacebookAssetSchema>;
