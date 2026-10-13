import { NotificationService } from "../notification/notification.service";
import { NOTIFICATION_TYPE, USER_STATUS } from "../../../generated/prisma/enums";
import status from "http-status";
import { AppError } from "../../error/errorHelpler/AppError";
import { prisma } from "../../lib/prisma";
import type { IIUpdatePostInterface, IPostInterface } from "./post.interface";
import { postUpdateSchema } from "./post.zodvalidation";
import type { IQueryParams } from "../../interface/queryBuilder.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  POST_STATUS,
  POST_TYPE,
  ROLE,
  STRIPE_PAYMENT_STATUS,
  type Post,
  type Prisma,
} from "../../../generated/prisma/client";
import { postFilterableFields, postSearchableFields } from "./post.constrain";
import type { IRequestUser } from "../../interface/IrequestUser.interface";
import { stripe } from "../../config/stripe.config";
import { envVars } from "../../config/env.config";
import { randomUUID } from "crypto";

const createPost = async (payload: IPostInterface, user: IRequestUser) => {
  const { post, notifications } = await prisma.$transaction(async tx => {
    const post = await tx.post.create({
      data: { ...payload, userId: user.userId, status: POST_STATUS.DRAFT, taka: Number(payload.taka) || 0 },
    });
    const notifications = [];
    if (user.role === ROLE.USER) {
      const creator = await tx.user.findUniqueOrThrow({ where: { id: user.userId }, select: { name: true } });
      const admins = await tx.user.findMany({
        where: { role: ROLE.ADMIN, status: USER_STATUS.ACTIVE, isDeleted: false, id: { not: user.userId } },
        select: { id: true },
      });
      for (const admin of admins) notifications.push(await NotificationService.persistNotification({
        recipientId: admin.id, senderId: user.userId,
        title: "New post submitted", message: `${creator.name} created a post "${post.title}".`,
        type: NOTIFICATION_TYPE.SYSTEM, entityId: post.id, entityType: "POST_CREATED",
      }, tx));
    }
    return { post, notifications };
  });
  notifications.forEach(NotificationService.emitNotification);
  return post;
};
const getAllPost = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Post,
    Prisma.PostWhereInput,
    Prisma.PostInclude
  >(prisma.post, query, {
    searchableFields: postSearchableFields,
    filterableFields: postFilterableFields,
  });
  const filteredQuery = queryBuilder
    .where({ status: POST_STATUS.APPROVED })
    .search()
    .filter();
  if (query.page || query.limit) {
    filteredQuery.pagination();
  }
  const result = await filteredQuery
    .sort()
    .include({
      user: true,
      _count: { select: { comments: true } },
      category: true,
    })
    .execute();

  return result;
};
const updatePost = async (payload: IIUpdatePostInterface, postId: string, user: IRequestUser) => {
  const data = postUpdateSchema.parse(payload);
  if (user.role !== ROLE.ADMIN && data.status !== undefined) throw new AppError(status.FORBIDDEN, "Only admins can review posts");
  const { updated, notifications } = await prisma.$transaction(async tx => {
    const post = await tx.post.findFirst({ where: { id: postId, ...(user.role === ROLE.ADMIN ? {} : { userId: user.userId }) } });
    if (!post) throw new AppError(status.NOT_FOUND, "Post not found");
    if (user.role !== ROLE.ADMIN && post.status === POST_STATUS.APPROVED) throw new AppError(status.BAD_REQUEST, "Approved posts cannot be edited by their author");
    const changes = { ...data, ...(user.role !== ROLE.ADMIN && post.status === POST_STATUS.REJECTED ? { status: POST_STATUS.DRAFT } : {}) };
    const contentChanged = Object.entries(changes).some(([field, value]) => field !== "status" && value !== undefined && post[field as keyof typeof post] !== value);
    const statusChanged = changes.status !== undefined && changes.status !== post.status;
    if (!contentChanged && !statusChanged) return { updated: post, notifications: [] };
    const writeData = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)) as Prisma.PostUncheckedUpdateManyInput;
    const changed = await tx.post.updateMany({ where: { id: postId, updatedAt: post.updatedAt }, data: writeData });
    if (!changed.count) throw new AppError(status.CONFLICT, "Post changed. Please refresh and try again.");
    const updated = await tx.post.findUniqueOrThrow({ where: { id: postId } });
    const notifications = [];
    if (user.role === ROLE.ADMIN) {
      if (statusChanged && (updated.status === POST_STATUS.APPROVED || updated.status === POST_STATUS.REJECTED)) {
        notifications.push(await NotificationService.persistNotification({
          recipientId: post.userId, senderId: user.userId,
          title: updated.status === POST_STATUS.APPROVED ? "Post approved" : "Post rejected",
          message: `An admin ${updated.status.toLowerCase()} your post "${updated.title}".`,
          type: updated.status === POST_STATUS.APPROVED ? NOTIFICATION_TYPE.POST_APPROVED : NOTIFICATION_TYPE.POST_REJECTED,
          entityId: postId, entityType: "POST",
        }, tx));
      }
      if (contentChanged || (statusChanged && updated.status === POST_STATUS.DRAFT)) {
        notifications.push(await NotificationService.persistNotification({
          recipientId: post.userId, senderId: user.userId,
          title: "Post updated", message: `An admin updated your post "${updated.title}"${updated.status === POST_STATUS.DRAFT && statusChanged ? " and moved it to draft" : ""}.`,
          type: NOTIFICATION_TYPE.SYSTEM, entityId: postId, entityType: "POST_UPDATED",
        }, tx));
      }
    }
    return { updated, notifications };
  });
  notifications.forEach(NotificationService.emitNotification);
  return updated;
};
const deletePost = async (postId: string, user: IRequestUser) => {
  const { deleted, notification } = await prisma.$transaction(async tx => {
    const post = await tx.post.findFirst({ where: { id: postId, ...(user.role === ROLE.ADMIN ? {} : { userId: user.userId }) } });
    if (!post) throw new AppError(status.NOT_FOUND, "Post not found");
    const deleted = await tx.post.delete({ where: { id: postId } });
    const notification = user.role === ROLE.ADMIN ? await NotificationService.persistNotification({
      recipientId: post.userId, senderId: user.userId,
      title: "Post deleted", message: `An admin deleted your post "${post.title}".`,
      type: NOTIFICATION_TYPE.SYSTEM, entityId: postId, entityType: "POST_DELETED",
    }, tx) : null;
    return { deleted, notification };
  });
  NotificationService.emitNotification(notification);
  return deleted;
};
const specificPost = async (postId: string, user: IRequestUser) => {
  const { userId, email, role } = user;

  const isExistPost = await prisma.post.findFirst({
    where: {
      id: postId,
    },
    include: {
      user: true,
      category: true,
      comments: true,
    },
  });
  if (!isExistPost) {
    throw new AppError(
      status.NOT_FOUND,
      `${postId} is does not exist in database modle `,
    );
  }

  if (
    role === ROLE.ADMIN ||
    isExistPost.userId === userId ||
    isExistPost.postType === POST_TYPE.FREE
  ) {
    return isExistPost;
  }

  const isExistUser = await prisma.user.findFirst({
    where: {
      id: userId,
      email,
    },
  });
  if (!isExistUser) {
    throw new AppError(status.NOT_FOUND, "user not found");
  }

  const checkPaymentByUser = await prisma.payment.findUnique({
    where: {
      userId_postId: {
        userId,
        postId: isExistPost.id,
      },
    },
  });
  if (
    checkPaymentByUser &&
    checkPaymentByUser.status === STRIPE_PAYMENT_STATUS.PAID
  ) {
    return isExistPost;
  }
  if (!checkPaymentByUser) {
    const transactionId = randomUUID();

    const createPayment = await prisma.payment.create({
      data: {
        transactionId,
        amount: isExistPost.taka,
        postId: isExistPost?.id,
        userId: userId,
      },
    });
    const session = stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: isExistPost.title,
            },
            unit_amount: Number(isExistPost.taka) * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: createPayment.id,
        postId: isExistPost.id,
        ownerId: isExistPost.userId,
        userId: isExistUser.id,
      },
      success_url: `${envVars.FRONTEND_URL}/dashboard/payment/payment-success`,
      cancel_url: `${envVars.FRONTEND_URL}`,
    });
    return {
      paymentUrl: (await session).url,
      userEmail: email,
    };
  } else if (
    checkPaymentByUser &&
    checkPaymentByUser.status === STRIPE_PAYMENT_STATUS.UNPAID
  ) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: `${isExistPost.title}`,
            },
            unit_amount: Number(isExistPost.taka) * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: checkPaymentByUser.id,
        postId: isExistPost.id,
        ownerId: isExistPost.userId,
        userId: isExistUser.id,
      },
      success_url: `${envVars.FRONTEND_URL}/dashboard/user/payment`,
      cancel_url: `${envVars.FRONTEND_URL}`,
    });

    return {
      paymentUrl: session.url,
      userEmail: email,
    };
  }

  return isExistPost;
};
const DashboardPost = async (user: IRequestUser) => {
  const { userId, role } = user;
  if (role === ROLE.USER) {
    const UserDashBoardPost = await prisma.$transaction(async (tx) => {
      try {
        const [allposts, totalPost] = await Promise.all([
          tx.post.findMany({
            where: {
              userId,
            },
            include: {
              category: true,
            },
          }),
          tx.post.count({
            where: {
              userId,
            },
          }),
        ]);
        const [ApprovedPost, countApprovedPost] = await Promise.all([
          tx.post.findMany({
            where: {
              status: POST_STATUS.APPROVED,
              userId,
            },
            include: {
              category: true,
            },
          }),
          tx.post.count({
            where: {
              status: POST_STATUS.APPROVED,
              userId,
            },
          }),
        ]);

        const [RejectPost, countRejectedPost] = await Promise.all([
          tx.post.findMany({
            where: {
              userId,
              status: POST_STATUS.REJECTED,
            },
            include: {
              category: true,
            },
          }),
          tx.post.count({
            where: {
              userId,
              status: POST_STATUS.REJECTED,
            },
          }),
        ]);

        const [DraftedPost, countDraftedPost] = await Promise.all([
          tx.post.findMany({
            where: {
              userId,
              status: POST_STATUS.DRAFT,
            },
            include: {
              category: true,
            },
          }),
          tx.post.count({
            where: {
              userId,
              status: POST_STATUS.DRAFT,
            },
          }),
        ]);

        const [paidPost, countPaidPost] = await Promise.all([
          tx.post.findMany({
            where: {
              userId,
              postType: POST_TYPE.PAID,
            },
            include: {
              payment: {
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  payment: true,
                },
              },
            },
          }),
          tx.post.count({
            where: {
              userId,
              postType: POST_TYPE.PAID,
            },
          }),
        ]);
        const [freePost, countfreePost] = await Promise.all([
          tx.post.findMany({
            where: {
              userId,
              postType: POST_TYPE.FREE,
            },
            include: {
              payment: {
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  payment: true,
                },
              },
            },
          }),
          tx.post.count({
            where: {
              userId,
              postType: POST_TYPE.FREE,
            },
          }),
        ]);

        return {
          totalPost,
          allposts,
          countApprovedPost,
          ApprovedPost,
          countRejectedPost,
          RejectPost,
          countDraftedPost,
          DraftedPost,
          countPaidPost,
          paidPost,
          countfreePost,
          freePost,
        };
      } catch (error) {
        console.log(error);
      }
    });
    return {
      UserDashBoardPost,
    };
  } else {
    const adminDashboardPost = await prisma.$transaction(async (tx) => {
      try {
        const [allposts, totalPost] = await Promise.all([
          tx.post.findMany({}),
          tx.post.count({}),
        ]);
        const ApprovedPost = await tx.post.count({
          where: {
            status: POST_STATUS.APPROVED,
          },
        });
        const [DraftedPost, countDraftedPost] = await Promise.all([
          tx.post.findMany({
            where: {
              status: POST_STATUS.DRAFT,
            },
            include: {
              category: true,
            },
          }),
          tx.post.count({
            where: {
              status: POST_STATUS.DRAFT,
            },
          }),
        ]);
        const paidPost = await tx.post.count({
          where: {
            postType: POST_TYPE.PAID,
          },
        });
        const freePost = await tx.post.count({
          where: {
            postType: POST_TYPE.FREE,
          },
        });

        return {
          totalPost,
          allposts,
          ApprovedPost,
          countDraftedPost,
          DraftedPost,
          paidPost,
          freePost,
        };
      } catch (error) {
        console.log(error);
      }
    });
    return {
      adminDashboardPost,
    };
  }
};
const postUpdateByadmin = async (postId: string, Poststatus: POST_STATUS, user: IRequestUser) => {
  if (user.role !== ROLE.ADMIN) throw new AppError(status.FORBIDDEN, "Only admins can review posts");
  return updatePost({ status: Poststatus }, postId, user);
};
export const postService = {
  createPost,
  getAllPost,
  updatePost,
  deletePost,
  specificPost,
  DashboardPost,
  postUpdateByadmin,
};
