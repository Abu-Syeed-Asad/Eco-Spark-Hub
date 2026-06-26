import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { index_Router } from "./app/routes";
import { globalsErrorHandler } from "./app/error/globalErrorHandler";
import { notFound } from "./app/middleware/notFount";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import { envVars } from "./app/config/env.config";

const app: Application = express();
app.use(express.json());
app.use(cors({ origin: envVars.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use("/api/v1", index_Router);

app.get("/", (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: "server running is perfectly",
  });
});
app.use(globalsErrorHandler);
app.use(notFound);

export default app;
