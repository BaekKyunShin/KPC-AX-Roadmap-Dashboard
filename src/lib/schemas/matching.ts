import { z } from 'zod';

// /api/matching/generate 입력 스키마
export const matchingGenerateSchema = z.object({
  projectId: z.string().uuid(),
  topN: z.number().int().min(1).max(10).default(3),
  preserveStatus: z.boolean().default(false),
});
