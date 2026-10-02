import { z } from 'zod';

export const createDonationSchema = z.object({
  campaignId: z.string().uuid(),
  // VND demo uses integer dong, never floating-point arithmetic for balances.
  amount: z.number().int().min(1000).max(1000000000),
  requestKey: z.string().uuid(),
  message: z.string().trim().max(500).optional(),
  isAnonymous: z.boolean().default(false),
}).strict();

export const emptyActionSchema = z.object({}).strict();
export const reasonSchema = z.object({ reason: z.string().trim().min(5).max(500) }).strict();
export type CreateDonationInput = z.infer<typeof createDonationSchema>;
