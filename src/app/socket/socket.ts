import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server;

export const initSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);

    socket.on("join-room", (userId: string) => {
      socket.join(userId);

      console.log(`${userId} joined room`);
    });

    socket.on("send-notification", (data) => {
      console.log("Received:", data);

      io.to(data.receiverId).emit("new-notification", data);
    });


    socket.on("disconnect", () => {
      console.log("Socket Disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  return io;
};
