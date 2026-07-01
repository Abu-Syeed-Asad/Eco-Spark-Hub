import type { VoteType } from "../../../generated/prisma/enums";

export interface IComment {
  content: string;
  postId: string;
  userId: string;
  parentId?: string;  
  votes: VoteType;
}