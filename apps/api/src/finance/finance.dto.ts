import { z } from 'zod';

export const financeListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.enum([
    'salary',
    'ads_spend',
    'software_subscription',
    'office_supplies',
    'hardware',
    'revenue_product_a',
    'revenue_product_b',
    'other',
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type FinanceListQuery = z.infer<typeof financeListQuerySchema>;

export const createFinanceTransactionSchema = z.object({
  amount: z.number(), // > 0 income, < 0 expense
  description: z.string().min(1).max(500),
  date: z.string().datetime(),
  receivedFrom: z.string().max(255).optional().nullable(),
  paidTo: z.string().max(255).optional().nullable(),
  category: z.enum([
    'salary',
    'ads_spend',
    'software_subscription',
    'office_supplies',
    'hardware',
    'revenue_product_a',
    'revenue_product_b',
    'other',
  ]),
  referenceNote: z.string().max(4000).optional().nullable(),
});

export type CreateFinanceTransactionDto = z.infer<typeof createFinanceTransactionSchema>;

export const updateFinanceTransactionSchema = createFinanceTransactionSchema.partial();

export type UpdateFinanceTransactionDto = z.infer<typeof updateFinanceTransactionSchema>;
