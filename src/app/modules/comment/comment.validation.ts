import { z } from "zod";
const content = z.string().trim().min(1, "Write a comment first").max(2000, "Comments can contain up to 2,000 characters");
// Posts use ULIDs; comments and reply references use UUIDs.
const postId = z.ulid();
export const createCommentSchema = z.object({ content, postId, parentId: z.uuid().optional() });
export const updateCommentSchema = z.object({ content });
export const commentQuerySchema = z.object({
  id: postId, page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
export const commentIdSchema = z.uuid();
