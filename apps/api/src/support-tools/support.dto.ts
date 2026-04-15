import { z } from 'zod';

export const supportListQuerySchema = z.object({
  q: z.string().optional(),
  platformType: z.enum(['salesmartly', 'jivo', 'wellytalk', 'other']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SupportListQuery = z.infer<typeof supportListQuerySchema>;

export const createSupportAccountSchema = z.object({
  companyName: z.string().min(1).max(500),
  platformType: z.enum(['salesmartly', 'jivo', 'wellytalk', 'other']),
  
  adminAccount: z.string().max(255).optional().nullable(),
  adminPassword: z.string().max(2000).optional().nullable(),
  adminNickname: z.string().max(255).optional().nullable(),

  csAccount: z.string().max(255).optional().nullable(),
  csPassword: z.string().max(2000).optional().nullable(),
  csNickname: z.string().max(255).optional().nullable(),

  financeAccount: z.string().max(255).optional().nullable(),
  financePassword: z.string().max(2000).optional().nullable(),
  financeNickname: z.string().max(255).optional().nullable(),

  notes: z.string().max(8000).optional().nullable(),
});

export type CreateSupportAccountDto = z.infer<typeof createSupportAccountSchema>;

export const updateSupportAccountSchema = createSupportAccountSchema.partial();

export type UpdateSupportAccountDto = z.infer<typeof updateSupportAccountSchema>;
