import status from "http-status"
import { AppError } from "../../error/errorHelpler/AppError"
import type { IRequestUser } from "../../interface/IrequestUser.interface"
import { prisma } from "../../lib/prisma"

import type { IComment, IupdateComment } from "./comment.interface"
import { NOTIFICATION_TYPE, ROLE } from "../../../generated/prisma/enums"
import { NotificationService } from "../notification/notification.service"

const commentCreate = async (paylaod: IComment) => {
  const comment = await prisma.comment.create({
    data: paylaod,
    include: {
      user: true,
      post:true,
    }
  })
     await NotificationService.createNotification({
       recipientId: comment.post.userId,

       senderId: comment.userId,

       title: "New Comment",

       message: `${comment.user.name} commented on your post`,

       type: NOTIFICATION_TYPE.COMMENT,

       entityId: comment.id,

       entityType: "COMMENT",
     });
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
    const comment_update = await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: updateComment,
      include: {
        user: true,
        post: true,
      },
    });
    await NotificationService.createNotification({
      recipientId: comment_update.post.userId,

      senderId: comment_update.userId,

      title: "Comment Updated",

      message: `${comment_update.user.name} updated a comment on your post`,

      type: NOTIFICATION_TYPE.COMMENT,

      entityId: comment_update.id,

      entityType: "COMMENT",
    });

    return comment_update;
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