import status from "http-status";
import { AppError } from "../../error/errorHelpler/AppError";
import type { IRequestUser } from "../../interface/IrequestUser.interface";
import { prisma } from "../../lib/prisma";
import type { IComment, IupdateComment } from "./comment.interface";
import { NOTIFICATION_TYPE, POST_STATUS, ROLE, VoteType } from "../../../generated/prisma/enums";
import { NotificationService } from "../notification/notification.service";
const author = { select: { id: true, name: true, image: true, role: true } };

const commentCreate = async (payload: IComment) => {
  const { comment, notifications } = await prisma.$transaction(async tx => {
    const post = await tx.post.findUnique({ where: { id: payload.postId } });
    if (!post || post.status !== POST_STATUS.APPROVED) throw new AppError(status.NOT_FOUND, "This post is not available for comments");
    const parent = payload.parentId ? await tx.comment.findUnique({ where: { id: payload.parentId } }) : null;
    if (payload.parentId && (!parent || parent.postId !== payload.postId)) throw new AppError(status.BAD_REQUEST, "Reply must belong to the same post");
    // Keep Facebook-style threads one level deep; replying to a reply stays in its thread.
    const parentId = parent ? parent.parentId ?? parent.id : null;
    const comment = await tx.comment.create({
      data: { content: payload.content, postId: payload.postId, userId: payload.userId, parentId, votes: VoteType.UPVOTE },
      include: { user: author },
    });
    const notifications = [await NotificationService.persistNotification({
      recipientId: post.userId, senderId: comment.userId,
      title: parent ? "New reply on your post" : "New Comment",
      message: `${comment.user.name} ${parent ? "replied to a comment" : "commented"} on your post`,
      type: parent ? NOTIFICATION_TYPE.COMMENT_REPLY : NOTIFICATION_TYPE.COMMENT,
      entityId: comment.postId, entityType: "POST",
    }, tx)];
    if (parent && parent.userId !== post.userId) notifications.push(await NotificationService.persistNotification({
      recipientId: parent.userId, senderId: comment.userId,
      title: "New reply", message: `${comment.user.name} replied to your comment`,
      type: NOTIFICATION_TYPE.COMMENT_REPLY, entityId: comment.postId, entityType: "POST",
    }, tx));
    return { comment, notifications };
  });
  notifications.forEach(NotificationService.emitNotification);
  return comment;
};

const showComment = async (postId: string, page = 1, limit = 5) => {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { status: true } });
  if (!post || post.status !== POST_STATUS.APPROVED) throw new AppError(status.NOT_FOUND, "Post not found");
  const where = { postId, parentId: null };
  return prisma.$transaction(async tx => {
    const [comments, totalThreads, totalCount] = await Promise.all([
    tx.comment.findMany({ where, include: {
      user: author, replies: { include: { user: author }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    tx.comment.count({ where }), tx.comment.count({ where: { postId } }),
    ]);
    // Include older replies-to-replies in the same visible thread without migrating them.
    const rootById = new Map(comments.flatMap(root => [
      [root.id, root] as const, ...root.replies.map(reply => [reply.id, root] as const),
    ]));
    let frontier = comments.flatMap(root => root.replies.map(reply => reply.id));
    while (frontier.length) {
      const descendants = await tx.comment.findMany({
        where: { postId, parentId: { in: frontier } }, include: { user: author },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      frontier = [];
      for (const reply of descendants) {
        const root = reply.parentId ? rootById.get(reply.parentId) : undefined;
        if (root && !rootById.has(reply.id)) {
          root.replies.push(reply); rootById.set(reply.id, root); frontier.push(reply.id);
        }
      }
    }
    comments.forEach(root => root.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)));
    return { comments, totalCount, page, totalPages: Math.ceil(totalThreads / limit) };
  });
};

const commentUpdate = async (commentId: string, user: IRequestUser, payload: IupdateComment) => {
  const result = await prisma.$transaction(async tx => {
    const comment = await tx.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.userId !== user.userId) throw new AppError(status.NOT_FOUND, "Comment not found or you cannot edit it");
    const updated = await tx.comment.update({ where: { id: commentId, userId: user.userId }, data: { content: payload.content }, include: { user: author } });
    const post = await tx.post.findUniqueOrThrow({ where: { id: updated.postId }, select: { userId: true } });
    const notification = comment.content !== payload.content ? await NotificationService.persistNotification({
      recipientId: post.userId, senderId: user.userId,
      title: "Comment updated", message: `${updated.user.name} updated a comment on your post`,
      type: NOTIFICATION_TYPE.COMMENT, entityId: updated.postId, entityType: "POST",
    }, tx) : null;
    return { updated, notification };
  });
  NotificationService.emitNotification(result.notification);
  return result.updated;
};

const CommentDelete = async (commentId: string, user: IRequestUser) => {
  return prisma.$transaction(async tx => {
    const comment = await tx.comment.findUnique({ where: { id: commentId } });
    if (!comment || (comment.userId !== user.userId && user.role !== ROLE.ADMIN)) throw new AppError(status.NOT_FOUND, "Comment not found or you cannot delete it");
    // Delete the complete thread in one statement, including any older nested replies.
    const rows = await tx.comment.findMany({ where: { postId: comment.postId }, select: { id: true, parentId: true } });
    const ids = new Set([commentId]);
    let size: number;
    do { size = ids.size; rows.forEach(row => { if (row.parentId && ids.has(row.parentId)) ids.add(row.id); }); } while (size !== ids.size);
    const result = await tx.comment.deleteMany({ where: { postId: comment.postId, id: { in: [...ids] } } });
    return { id: commentId, deletedCount: result.count };
  });
};
export const commentService = { commentCreate, showComment, commentUpdate, CommentDelete };
