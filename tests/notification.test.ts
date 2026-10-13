import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/app/lib/prisma";
import { NotificationService } from "../src/app/modules/notification/notification.service";
import { NOTIFICATION_TYPE } from "../src/generated/prisma/enums";
const restores: (() => void)[] = [];
function stub<T extends object, K extends keyof T>(target: T, key: K, implementation: (...args: any[]) => any) {
  const original = target[key];
  const fn = mock.fn(implementation);
  target[key] = fn as T[K];
  restores.push(() => { target[key] = original; });
  return fn;
}
function restore() { restores.splice(0).reverse().forEach(fn => fn()); }
import { checkAuth } from "../src/app/middleware/checkAuth";
import { jwtUtils } from "../src/app/utils/jwt";
import { envVars } from "../src/app/config/env.config";
import type { Request, Response, NextFunction } from "express";
const payload = { recipientId: "recipient", senderId: "sender", title: "Comment", message: "New comment", type: NOTIFICATION_TYPE.COMMENT };

test("self notifications are skipped without writing to the database", async () => {
  const create = stub(prisma.notification, "create", async () => { throw new Error("Unexpected write"); });
  try {
    assert.equal(await NotificationService.createNotification({ ...payload, senderId: "recipient" }), null);
    assert.equal(create.mock.callCount(), 0);
  } finally { restore(); }
});

test("notifications persist even when the socket server is offline and only public sender fields are selected", async () => {
  const saved = { id: "notification", ...payload, isRead: false };
  const create = stub(prisma.notification, "create", async () => saved);
  try {
    assert.deepEqual(await NotificationService.createNotification(payload), saved);
    assert.deepEqual(create.mock.calls[0]?.arguments[0], { data: payload, include: { sender: { select: { id: true, name: true, image: true } } } });
  } finally { restore(); }
});

test("mark read filters by recipient and denies notifications owned by another user", async () => {
  const update = stub(prisma.notification, "updateMany", async () => ({ count: 0 }));
  try {
    await assert.rejects(NotificationService.markAsRead("foreign-notification", "viewer"), /Notification not found/);
    assert.deepEqual(update.mock.calls[0]?.arguments[0], { where: { id: "foreign-notification", recipientId: "viewer" }, data: { isRead: true } });
  } finally { restore(); }
});

test("mark read is idempotent and mark all read only updates the current recipient", async () => {
  const update = stub(prisma.notification, "updateMany", async () => ({ count: 1 }));
  try {
    assert.deepEqual(await NotificationService.markAsRead("mine", "viewer"), { id: "mine", isRead: true });
    await NotificationService.markAllAsRead("viewer");
    assert.deepEqual(update.mock.calls[1]?.arguments[0], { where: { recipientId: "viewer", isRead: false }, data: { isRead: true } });
  } finally { restore(); }
});

test("history pagination and unread count remain scoped to the current recipient", async () => {
  const find = stub(prisma.notification, "findMany", async () => [{ id: "mine" }]);
  const count = stub(prisma.notification, "count", async (args: { where: { isRead?: boolean } }) => args.where.isRead === false ? 3 : 42);
  stub(prisma, "$transaction", async (queries: Promise<unknown>[]) => Promise.all(queries));
  try {
    const result = await NotificationService.getMyNotifications("viewer", 2, 20);
    assert.equal(result.unreadCount, 3);
    assert.equal(result.totalPages, 3);
    const args = find.mock.calls[0]?.arguments[0];
    assert.deepEqual(args?.where, { recipientId: "viewer" });
    assert.equal(args?.skip, 20);
    assert.equal(args?.take, 20);
    assert.deepEqual(count.mock.calls[1]?.arguments[0], { where: { recipientId: "viewer", isRead: false } });
  } finally { restore(); }
});

test("expired sessions cannot access notification endpoints even with an access cookie", async () => {
  stub(prisma.session, "findFirst", async () => null);
  try {
    const req = { cookies: { session_token: "expired", access_token: "access" } } as unknown as Request;
    let error: unknown;
    await checkAuth()(req, {} as Response, ((value: unknown) => { error = value; }) as NextFunction);
    assert.match(String(error), /Invalid or expired session/);
  } finally { restore(); }
});

test("an access token for another user cannot authenticate a valid session", async () => {
  const createdAt = new Date(), expiresAt = new Date(Date.now() + 3600000);
  stub(prisma.session, "findFirst", async () => ({ userId: "viewer", createdAt, expiresAt, user: { id: "viewer", role: "USER", email: "viewer@example.com", status: "ACTIVE", isDeleted: false } }));
  try {
    const accessToken = jwtUtils.createToken({ userId: "other", role: "USER" }, envVars.ACCESS_TOKEN_SECRET, "1h");
    const req = { cookies: { session_token: "valid", access_token: accessToken } } as unknown as Request;
    let error: unknown;
    await checkAuth()(req, {} as Response, ((value: unknown) => { error = value; }) as NextFunction);
    assert.match(String(error), /Token does not match session/);
  } finally { restore(); }
});
