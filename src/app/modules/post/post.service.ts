import status from "http-status";
import { AppError } from "../../error/errorHelpler/AppError";
import { prisma } from "../../lib/prisma";
import type { IIUpdatePostInterface, IPostInterface } from "./post.interface";
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

const createPost = async (payload: IPostInterface) => {
  const postCreate = await prisma.post.create({
    data: {
      ...payload,
      taka: Number(payload.taka) || 0,
    },
  });
  if (!postCreate) {
    throw new AppError(status.BAD_REQUEST, "post create faile ");
  }
  return postCreate;
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
  const result = await queryBuilder
    .where({ status: POST_STATUS.APPROVED })
    .search()
    .filter()
    .pagination()
    .sort()
    .include({
      user: true,
      category: true,
    })
    .execute();

  return result;
};
const updatePost = async (payload: IIUpdatePostInterface, postId: string) => {
  const isExistPost = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });
  if (!isExistPost) {
    throw new AppError(status.NOT_FOUND, "post not found ");
  }
  if (isExistPost.status === POST_STATUS.APPROVED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Your post is Already Approved so you can not change ",
    );
  }
  if (isExistPost.status === POST_STATUS.REJECTED) {
    const updatedRejectPost = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        ...payload,
        status: POST_STATUS.DRAFT,
      },
    });
    return updatedRejectPost;
  }
  const updatePost = await prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      ...payload,
    },
  });
  return updatePost;
};
const deletePost = async (postId: string, user: IRequestUser) => {
  const postExist = await prisma.post.findFirst({
    where: {
      id: postId,
      userId: user.userId,
    },
  });
  if (!postExist) {
    throw new AppError(status.NOT_FOUND, "post not found ");
  }
  const deletePost = await prisma.post.delete({
    where: {
      id: postId,
      userId: user.userId,
    },
  });
  return deletePost;
};
const specificPost = async (postId: string, user: IRequestUser) => {
  const { userId, email } = user;
  const isExistUser = await prisma.user.findFirst({
    where: {
      id: userId,
      email,
    },
  });
  if (!isExistUser) {
    throw new AppError(status.NOT_FOUND,"user not found")
  }

  const isExistPost = await prisma.post.findFirst({
    where: {
      id:postId,
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

  if (isExistPost.userId === userId) {
    return isExistPost;
  }
  if (isExistPost.postType === POST_TYPE.FREE) {
    return isExistPost;
  }
 
  if (Number(isExistPost.taka) > Number(isExistUser?.totalAmount)) {
    return "your balance less then the post  ";
  }

  const checkPaymentByUser = await prisma.payment.findUnique({
    where: {
      userId: userId,
      postId:isExistPost?.id,
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
        userId :isExistUser.id
      },
      success_url: `${envVars.FRONTEND_URL}/dashboard/payment/payment-success`,
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
          tx.post.findMany({
            where: {
              userId,
            },
          }),
          tx.post.count({
            where: {
              userId,
            },
          }),
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
const postUpdateByadmin = async (postId: string, Poststatus: POST_STATUS) => {
  const isExistPost = await prisma.post.findFirst({
    where: {
      id: postId,
    },
  });
  if (!isExistPost) {
    throw new AppError(
      status.NOT_FOUND,
      `Your Post id ${postId}  not found in the system`,
    );
  }

  if (Poststatus === POST_STATUS.APPROVED) {
    const approvedPost = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        status: Poststatus,
      },
    });
    return approvedPost;
  } else if (Poststatus === POST_STATUS.REJECTED) {
    const RejectedPost = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        status: Poststatus,
      },
    });
    return RejectedPost;
  }
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
