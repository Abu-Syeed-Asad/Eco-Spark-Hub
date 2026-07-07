import status from "http-status"
import { AppError } from "../../error/errorHelpler/AppError"
import type { IRequestUser } from "../../interface/IrequestUser.interface"
import { prisma } from "../../lib/prisma"

import type { IComment, IupdateComment } from "./comment.interface"
import { ROLE } from "../../../generated/prisma/enums"

const commentCreate = async (paylaod: IComment) => {
  const comment = await prisma.comment.create({
    data:paylaod,
  })
  return comment
}
const showComment = async (PsotId :string) => {
  const postRelatedComment = await prisma.comment.findMany({
    where: {
      postId: PsotId
    },
    include: {
      parent: true,
      replies: true,
      
    }
  });
  return postRelatedComment
}
const commentUpdate = async (commentId: string, userInfo: IRequestUser, updateComment:IupdateComment) => {
  const isExistcomment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      userId:userInfo.userId,
    }
  })
  if (!isExistcomment) {
    throw new AppError(status.NOT_FOUND, "this comment not exist in the database");
  }
  if (isExistcomment || userInfo.role === ROLE.ADMIN) {
    const conment_update = await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: updateComment,
    });
    return conment_update;
  }

}
const CommentDelete = async (commentId: string, user: IRequestUser) => {
  const isExistcomment = await prisma.comment.findUnique({
    where: {
      id: commentId,
      userId:user.userId
    }
  });
  if (!isExistcomment) {
    throw new AppError(status.NOT_FOUND, "comment not found ");
  }
  if (isExistcomment || user.role === ROLE.ADMIN) {
      const deleteComment = await prisma.comment.delete({
    where: {
      id:commentId
    }
  })
  return deleteComment
  }
  else {
    throw new AppError (status.BAD_REQUEST,"Invalid request")
  }

}
export const commentService = {
  commentCreate,
  showComment,
  CommentDelete,
  commentUpdate,
}