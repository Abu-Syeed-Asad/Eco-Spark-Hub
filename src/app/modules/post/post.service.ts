import status from "http-status";
import { AppError } from "../../error/errorHelpler/AppError";
import { prisma } from "../../lib/prisma";
import type { IIUpdatePostInterface, IPostInterface } from "./post.interface";

const createPost = async (payload: IPostInterface) => {
  const postCreate = await prisma.post.create({
    data: payload,
  });
  if (!postCreate) {
    throw new AppError(status.BAD_REQUEST, "post create faile ");
  }
  return postCreate;
};
const getAllPost = async () => {
  const allpost = await prisma.post.findMany();
  if (!allpost) {
     throw new AppError(status.BAD_REQUEST,"")
  }
  return allpost;
}
const updatePost = async (payload: IIUpdatePostInterface,postId:string) => {

    const isExistPost = await prisma.post.findUnique({
      where: {
        id:postId
      }
    })
    if (!isExistPost) {
      throw new AppError(status.NOT_FOUND, "post not found ");
    };
    const updatePost = await prisma.post.update({
      where: {
        id:postId,
      },
      data:payload,
    })
 return updatePost
}
const deletePost = async (postId: string) => {
  const postExist = await prisma.post.findFirst({
    where: {
      id: postId,
    }
  });
  if (!postExist) {
    throw new AppError(status.NOT_FOUND, "post not found ");

  }
  const deletePost = await prisma.post.delete({
    where: {
      id: postId
    }
  });
  return deletePost;
}

const specificPost = async(postId:string) => {
  const postExist = await prisma.post.findFirst({
    where: {
      id: postId,
    },
  });
  if (!postExist) {
    throw new AppError(status.NOT_FOUND, "post not found ");
  }
  return postExist
}

export const postService = {
  createPost,
  getAllPost,
  updatePost,
  deletePost,
  specificPost
};
