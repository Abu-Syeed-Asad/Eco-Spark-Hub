import status from "http-status";
import { randomUUID } from "crypto";
import { AppError } from "../../error/errorHelpler/AppError";
import { prisma } from "../../lib/prisma";
import type { IIUpdatePostInterface, IPostInterface } from "./post.interface";
import type { IQueryParams } from "../../interface/queryBuilder.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  PAYMENT_STATUS,
  type Post,
  type Prisma,
} from "../../../generated/prisma/client";
import { postFilterableFields, postSearchableFields } from "./post.constrain";
import { stripe } from "../../config/stripe.config";
import { envVars } from "../../config/env.config";

const createPost = async (payload: IPostInterface) => {
  // Ensure `taka` is stored as a number (coerce if a string slipped through)
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
    .search()
    .filter()
    .pagination()
    .sort()
    .include({
      user: true,
      category: true,
    })
    .execute();
  console.log("result", result);

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
  const updatePost = await prisma.post.update({
    where: {
      id: postId,
    },
    data: payload,
  });
  return updatePost;
};
const deletePost = async (postId: string) => {
  const postExist = await prisma.post.findFirst({
    where: {
      id: postId,
    },
  });
  if (!postExist) {
    throw new AppError(status.NOT_FOUND, "post not found ");
  }
  const deletePost = await prisma.post.delete({
    where: {
      id: postId,
    },
  });
  return deletePost;
};

const specificPost = async (postId: string) => {
  const postExist = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    include: {
      payment: true,
      user: true,
    },
  });
  if (!postExist) {
    throw new AppError(status.NOT_FOUND, "post not found ");
  }
  // If the post is free, return it immediately
  if (postExist.paymentStatus === PAYMENT_STATUS.FREE) {
    return { postExist };
  }

  // If stripe payment is unpaid, create/find payment and return a checkout session
  if (postExist.paymentStatus === PAYMENT_STATUS.PAID) {
    let paymentData = postExist.payment;

    // Create payment record only if it doesn't exist
    if (!paymentData) {
      const transactionId = randomUUID();
      paymentData = await prisma.payment.create({
        data: {
          postId,
          amount: postExist.taka,
          transactionId,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: `Post Title: ${postExist.title}`,
            },
            unit_amount: Math.round((postExist.taka || 0) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        postId: postExist.id,
        paymentId: paymentData.id,
      },
      success_url: `${envVars.FRONTEND_URL}/post/${postExist.id}`,
      cancel_url: `${envVars.FRONTEND_URL}`,
    });

    return {
      postExist,
      paymentData,
      paymentUrl: session.url,
    };
  }

  // If already paid, return post and associated payment data
  const paymentData = postExist.payment
    ? postExist.payment
    : await prisma.payment.findUnique({ where: { postId } });

  return { postExist, paymentData };
};

export const postService = {
  createPost,
  getAllPost,
  updatePost,
  deletePost,
  specificPost,
};
