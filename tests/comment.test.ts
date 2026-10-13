import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/app/lib/prisma";
import { commentService } from "../src/app/modules/comment/comment.service";
import { NotificationService } from "../src/app/modules/notification/notification.service";
import { createCommentSchema, updateCommentSchema, commentQuerySchema, commentIdSchema } from "../src/app/modules/comment/comment.validation";
import { ROLE } from "../src/generated/prisma/enums";
const restores: (() => void)[] = [];
function stub<T extends object, K extends keyof T>(target: T, key: K, implementation: (...args: any[]) => any) {
  const original = target[key]; const fn = mock.fn(implementation);
  target[key] = fn as T[K]; restores.push(() => { target[key] = original; }); return fn;
}
function restore() { restores.splice(0).reverse().forEach(fn => fn()); }
function transaction() { stub(prisma, "$transaction", async (callback: (tx: typeof prisma) => unknown) => callback(prisma)); }
const user = { userId: "author", email: "author@example.com", role: ROLE.USER };
const payload = { userId: "author", content: "A useful idea", postId: "post" };

test("comment validation trims text, rejects empty/oversized text, and strips identity injection", () => {
  const postId = "01KWJ183NQ0ZG2WVZNH1V5R4YR";
  assert.deepEqual(createCommentSchema.parse({ postId, content: "  hello  ", userId: "victim", votes: "DOWNVOTE" }), { postId, content: "hello" });
  assert.equal(createCommentSchema.safeParse({ postId, content: "  " }).success, false);
  assert.equal(updateCommentSchema.safeParse({ content: "x".repeat(2001) }).success, false);
  assert.equal(commentQuerySchema.safeParse({ id: postId, limit: 100 }).success, false);
});

test("loading and posting comments accept post ULIDs while reply/edit/delete IDs remain UUIDs", () => {
  const postId = "01KWJ183NQ0ZG2WVZNH1V5R4YR";
  const commentId = "c08b1b47-1c9f-4c64-9f81-06a01a721b60";
  assert.deepEqual(commentQuerySchema.parse({ id: postId, page: "1", limit: "5" }), { id: postId, page: 1, limit: 5 });
  assert.equal(createCommentSchema.parse({ postId, content: "Reply", parentId: commentId }).parentId, commentId);
  assert.equal(commentIdSchema.parse(commentId), commentId);
  assert.equal(commentQuerySchema.safeParse({ id: "invalid" }).success, false);
  assert.equal(createCommentSchema.safeParse({ postId, content: "Reply", parentId: postId }).success, false);
});

test("comments cannot be created on unavailable or unapproved posts", async () => {
  transaction(); stub(prisma.post, "findUnique", async () => ({ status: "DRAFT" }));
  const create = stub(prisma.comment, "create", async () => { throw new Error("Unexpected write"); });
  try { await assert.rejects(commentService.commentCreate(payload), /not available/); assert.equal(create.mock.callCount(), 0); } finally { restore(); }
});

test("a reply cannot target a comment belonging to another post", async () => {
  transaction(); stub(prisma.post, "findUnique", async () => ({ status: "APPROVED", userId: "owner" }));
  stub(prisma.comment, "findUnique", async () => ({ id: "parent", postId: "different-post" }));
  try { await assert.rejects(commentService.commentCreate({ ...payload, parentId: "parent" }), /same post/); } finally { restore(); }
});

test("replying to a reply keeps its thread and notifies the post owner and original commenter", async () => {
  transaction(); stub(prisma.post, "findUnique", async () => ({ status: "APPROVED", userId: "owner" }));
  stub(prisma.comment, "findUnique", async () => ({ id: "reply", postId: "post", parentId: "root", userId: "commenter" }));
  const create = stub(prisma.comment, "create", async () => ({ ...payload, id: "new", parentId: "root", user: { name: "Author" } }));
  const notify = stub(NotificationService, "persistNotification", async () => null);
  try {
    await commentService.commentCreate({ ...payload, parentId: "reply" });
    assert.equal(create.mock.calls[0]?.arguments[0].data.parentId, "root");
    assert.deepEqual(notify.mock.calls.map(call => call.arguments[0].recipientId), ["owner", "commenter"]);
  } finally { restore(); }
});

test("only the comment author can edit, even if another user is an admin", async () => {
  transaction(); stub(prisma.comment, "findUnique", async () => ({ id: "comment", userId: "someone-else" }));
  const update = stub(prisma.comment, "update", async () => null);
  try {
    await assert.rejects(commentService.commentUpdate("comment", user, { content: "changed" }), /cannot edit/);
    await assert.rejects(commentService.commentUpdate("comment", { ...user, role: ROLE.ADMIN }, { content: "changed" }), /cannot edit/);
    assert.equal(update.mock.callCount(), 0);
  } finally { restore(); }
});

test("foreign comments cannot be deleted by regular users", async () => {
  transaction(); stub(prisma.comment, "findUnique", async () => ({ id: "comment", userId: "someone-else" }));
  const remove = stub(prisma.comment, "deleteMany", async () => ({ count: 1 }));
  try { await assert.rejects(commentService.CommentDelete("comment", user), /cannot delete/); assert.equal(remove.mock.callCount(), 0); } finally { restore(); }
});

test("an admin can delete a thread and its nested descendants without touching unrelated comments", async () => {
  transaction(); stub(prisma.comment, "findUnique", async () => ({ id: "root", userId: "someone-else", postId: "post" }));
  stub(prisma.comment, "findMany", async () => [ { id: "root", parentId: null }, { id: "child", parentId: "root" }, { id: "grandchild", parentId: "child" }, { id: "unrelated", parentId: null } ]);
  const remove = stub(prisma.comment, "deleteMany", async () => ({ count: 3 }));
  try {
    assert.deepEqual(await commentService.CommentDelete("root", { ...user, role: ROLE.ADMIN }), { id: "root", deletedCount: 3 });
    assert.deepEqual(remove.mock.calls[0]?.arguments[0].where, { postId: "post", id: { in: ["root", "child", "grandchild"] } });
  } finally { restore(); }
});

test("history paginates root threads and includes legacy nested replies with public author fields", async () => {
  transaction(); stub(prisma.post, "findUnique", async () => ({ status: "APPROVED" }));
  const date = new Date();
  const find = stub(prisma.comment, "findMany", async (args: any) => {
    if (args.where.parentId === null) return [{ id: "root", replies: [{ id: "child", parentId: "root", createdAt: date }] }];
    if (args.where.parentId.in.includes("child")) return [{ id: "grandchild", parentId: "child", createdAt: date }];
    return [];
  });
  stub(prisma.comment, "count", async (args: any) => args.where.parentId === null ? 11 : 25);
  try {
    const result = await commentService.showComment("post", 2, 5);
    assert.equal(result.totalPages, 3); assert.equal(result.totalCount, 25);
    assert.deepEqual(result.comments[0]?.replies.map((row: any) => row.id), ["child", "grandchild"]);
    const args = find.mock.calls[0]?.arguments[0];
    assert.equal(args.skip, 5); assert.equal(args.take, 5);
    assert.deepEqual(args.include.user.select, { id: true, name: true, image: true, role: true });
  } finally { restore(); }
});
