
import express,{type Application, type Request, type Response,  } from "express";
import { index_Router } from "./app/routes";
import { globalsErrorHandler } from "./app/error/globalErrorHandler";




 const app: Application = express()
app.use(express.json())

app.use("/api/v1", index_Router);

app.get("/", (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: "server running is perfectly"
  })
})
app.use(globalsErrorHandler)

export default app;