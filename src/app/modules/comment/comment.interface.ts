export interface IComment {
  content: string;
  postId: string;
  userId: string;
  parentId?: string | undefined;
}
export interface IupdateComment { content: string; }
