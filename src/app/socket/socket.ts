import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import { prisma } from "../lib/prisma";
import { envVars } from "../config/env.config";
import { USER_STATUS } from "../../generated/prisma/enums";
let io: Server | undefined;
export const initSocket = (server: HTTPServer) => {
  io = new Server(server, { cors: { origin: envVars.FRONTEND_URL, credentials: true } });
  io.use(async (socket, next) => {
    try {
      const value = socket.handshake.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith("session_token="))?.slice(14);
      if (!value) return next(new Error("Authentication required"));
      const token = decodeURIComponent(value);
      const session = await prisma.session.findFirst({ where: { token, expiresAt: { gt: new Date() } }, include: { user: true } });
      if (!session || session.user.isDeleted || session.user.status !== USER_STATUS.ACTIVE) return next(new Error("Invalid session"));
      socket.data.userId = session.userId;
      socket.data.token = token;
      next();
    } catch { next(new Error("Authentication failed")); }
  });
  io.on("connection", socket => {
    void socket.join(socket.data.userId);
    const timer = setInterval(() => {
      void prisma.session.findFirst({ where: { token: socket.data.token, expiresAt: { gt: new Date() } }, include: { user: true } }).then(session => {
        if (!session || session.user.isDeleted || session.user.status !== USER_STATUS.ACTIVE) socket.disconnect(true);
      }).catch(() => socket.disconnect(true));
    }, 30000);
    socket.on("disconnect", () => clearInterval(timer));
  });
  return io;
};
export const getIO = () => io;
