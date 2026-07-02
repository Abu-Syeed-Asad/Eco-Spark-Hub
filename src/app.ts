import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import { index_Router } from "./app/routes";
import { globalsErrorHandler } from "./app/error/globalErrorHandler";
import { notFound } from "./app/middleware/notFount";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import { envVars } from "./app/config/env.config";
import { paymentControler } from "./app/modules/payment/payment.controller";

const app: Application = express();
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));
app.use(cors({ origin: envVars.FRONTEND_URL, credentials: true }));
app.use(cookieParser());

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentControler.handleStripeWebhookEvent,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
