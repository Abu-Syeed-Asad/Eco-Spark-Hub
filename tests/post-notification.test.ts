import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/app/lib/prisma";
import { postService } from "../src/app/modules/post/post.service";
import { NotificationService } from "../src/app/modules/notification/notification.service";
import { postUpdateSchema } from "../src/app/modules/post/post.zodvalidation";
import { ROLE, POST_STATUS, POST_TYPE, NOTIFICATION_TYPE } from "../src/generated/prisma/enums";
const restores: (() => void)[] = [];
function stub<T extends object, K extends keyof T>(target: T, key: K, implementation: (...args: any[]) => any) {
  const original = target[key], fn = mock.fn(implementation); target[key] = fn as T[K];
  restores.push(() => { target[key] = original; }); return fn;
}
function restore() { restores.splice(0).reverse().forEach(fn => fn()); }
function transaction() { stub(prisma, "$transaction", async (callback: (tx: typeof prisma) => unknown) => callback(prisma)); }
const admin = { userId: "admin", email: "admin@example.com", role: ROLE.ADMIN };
const user = { userId: "owner", email: "owner@example.com", role: ROLE.USER };
const post = { id: "01KWJ183NQ0ZG2WVZNH1V5R4YR", userId: "owner", title: "Original post", description: "Original description", status: POST_STATUS.DRAFT, postType: POST_TYPE.PAID, taka: 100, updatedAt: new Date() };
function notifications() {
  const persist = stub(NotificationService, "persistNotification", async (payload: any) => payload);
  const emit = stub(NotificationService, "emitNotification", () => {});
  return { persist, emit };
}
function updateDb(status: POST_STATUS = POST_STATUS.DRAFT) {
  transaction(); stub(prisma.post, "findFirst", async () => ({ ...post, status }));
  const update = stub(prisma.post, "updateMany", async () => ({ count: 1 }));
  stub(prisma.post, "findUniqueOrThrow", async () => ({ ...post, status })); return update;
}

test("status-only updates do not insert defaults or change post ownership", () => {
  assert.deepEqual(postUpdateSchema.parse({ status: "APPROVED", userId: "different-owner" }), { status: "APPROVED" });
});

test("a user's new post is bound to the session and notifies every active admin with the creator's name", async () => {
  transaction(); const create = stub(prisma.post, "create", async () => post);
  stub(prisma.user, "findUniqueOrThrow", async () => ({ name: "Alex" }));
  const admins = stub(prisma.user, "findMany", async () => [{ id: "admin-1" }, { id: "admin-2" }]);
  const { persist, emit } = notifications();
  try {
    await postService.createPost({ title: post.title, description: post.description, userId: "forged-owner", status: POST_STATUS.APPROVED, postType: POST_TYPE.PAID, taka: 100, categoryId: "category" }, user);
    assert.equal(create.mock.calls[0]?.arguments[0].data.userId, "owner");
    assert.equal(create.mock.calls[0]?.arguments[0].data.status, "DRAFT");
    assert.deepEqual(persist.mock.calls.map(c => c.arguments[0].recipientId), ["admin-1", "admin-2"]);
    assert.match(persist.mock.calls[0]?.arguments[0].message, /Alex created a post/);
    assert.equal(persist.mock.calls[0]?.arguments[0].entityType, "POST_CREATED");
    assert.equal(admins.mock.calls[0]?.arguments[0].where.isDeleted, false);
    assert.equal(admins.mock.calls[0]?.arguments[0].where.status, "ACTIVE");
    assert.equal(emit.mock.callCount(), 2);
  } finally { restore(); }
});

test("approval through the general update endpoint notifies the owner and preserves paid content", async () => {
  const update = updateDb(); stub(prisma.post, "findUniqueOrThrow", async () => ({ ...post, status: POST_STATUS.APPROVED }));
  const { persist } = notifications();
  try {
    await postService.updatePost({ status: POST_STATUS.APPROVED }, post.id, admin);
    assert.deepEqual(update.mock.calls[0]?.arguments[0].data, { status: "APPROVED" });
    assert.equal(persist.mock.callCount(), 1);
    assert.equal(persist.mock.calls[0]?.arguments[0].type, NOTIFICATION_TYPE.POST_APPROVED);
    assert.equal(persist.mock.calls[0]?.arguments[0].recipientId, "owner");
    assert.equal(persist.mock.calls[0]?.arguments[0].senderId, "admin");
  } finally { restore(); }
});

test("admins can approve rejected posts instead of resetting them to draft", async () => {
  const update = updateDb(POST_STATUS.REJECTED);
  stub(prisma.post, "findUniqueOrThrow", async () => ({ ...post, status: POST_STATUS.APPROVED })); notifications();
  try { await postService.postUpdateByadmin(post.id, POST_STATUS.APPROVED, admin); assert.equal(update.mock.calls[0]?.arguments[0].data.status, "APPROVED"); } finally { restore(); }
});

test("admin content edits notify the author", async () => {
  updateDb(); stub(prisma.post, "findUniqueOrThrow", async () => ({ ...post, title: "Updated post" }));
  const { persist } = notifications();
  try { await postService.updatePost({ title: "Updated post" }, post.id, admin); assert.equal(persist.mock.calls[0]?.arguments[0].entityType, "POST_UPDATED"); assert.equal(persist.mock.calls[0]?.arguments[0].recipientId, "owner"); } finally { restore(); }
});

test("repeated approvals and unchanged updates do not create duplicate alerts", async () => {
  const update = updateDb(POST_STATUS.APPROVED); const { persist } = notifications();
  try {
    await postService.updatePost({ status: POST_STATUS.APPROVED, title: post.title }, post.id, admin);
    assert.equal(update.mock.callCount(), 0); assert.equal(persist.mock.callCount(), 0);
  } finally { restore(); }
});

test("users cannot approve their own posts", async () => {
  try { await assert.rejects(postService.updatePost({ status: POST_STATUS.APPROVED }, post.id, user), /Only admins/); } finally { restore(); }
});

test("deleting a post as admin saves a durable alert for its original owner", async () => {
  transaction(); stub(prisma.post, "findFirst", async () => post); stub(prisma.post, "delete", async () => post);
  const { persist, emit } = notifications();
  try {
    await postService.deletePost(post.id, admin);
    const payload = persist.mock.calls[0]?.arguments[0];
    assert.equal(payload.recipientId, "owner"); assert.equal(payload.entityType, "POST_DELETED");
    assert.match(payload.message, /Original post/); assert.equal(emit.mock.callCount(), 1);
  } finally { restore(); }
});

test("a user deleting their own post does not receive an admin-action notification", async () => {
  transaction(); stub(prisma.post, "findFirst", async () => post); stub(prisma.post, "delete", async () => post);
  const { persist } = notifications();
  try { await postService.deletePost(post.id, user); assert.equal(persist.mock.callCount(), 0); } finally { restore(); }
});

test("failed notification persistence rejects the post update and sends no socket event", async () => {
  updateDb(); stub(prisma.post, "findUniqueOrThrow", async () => ({ ...post, title: "Updated post" }));
  const { emit } = notifications(); stub(NotificationService, "persistNotification", async () => { throw new Error("Notification write failed"); });
  try { await assert.rejects(postService.updatePost({ title: "Updated post" }, post.id, admin), /Notification write failed/); assert.equal(emit.mock.callCount(), 0); } finally { restore(); }
});
