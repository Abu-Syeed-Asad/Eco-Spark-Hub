import type {

  POST_STATUS,
  POST_TYPE,
} from "../../../generated/prisma/enums";

export interface IPostInterface {
  title: string;
  description: string;
  photo?: string;
  postType: POST_TYPE;
  status: POST_STATUS;
  userId: string;
  categoryId: string;
  taka: number;
}
export interface IIUpdatePostInterface {
  title?: string;
  description?: string;
  photo?: string;
  postType?: POST_TYPE;
  userId?: string;
  categoryId?: string;
}
