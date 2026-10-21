import { z } from "zod";
import { paginationQuerySchema } from "../../core/utils/pagination.util";

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(2000),
  isPrivate: z.boolean().optional().default(false),
});

export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  campaignId: z.string().trim().min(1).max(36).optional(),
  mediaUrls: z.array(z.string().trim().max(1000)).max(10).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const communityListQuerySchema = paginationQuerySchema;

const id = z.string().min(1).max(36);
export const communityParamsSchema = z.object({ id });
export const postParamsSchema = z.object({ id, postId: id });

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
