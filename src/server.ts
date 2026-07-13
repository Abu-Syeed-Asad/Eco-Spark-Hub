import http from "http";
import app from "./app";
import { envVars } from "./app/config/env.config";
import { prisma } from "./app/lib/prisma";
import { initSocket } from "./app/socket/socket";
const EcohubServer = async () => {
  try {
    const server = http.createServer(app);

    // Socket.IO start
    initSocket(server);

    server.listen(envVars.PORT, () => {
      console.log(
        `this app is running on port http://localhost:${envVars.PORT}`,
      );
    });
  } catch (error) {
    console.log(error);

    await prisma.$disconnect();

    process.exit(1);
  }
};

EcohubServer();
