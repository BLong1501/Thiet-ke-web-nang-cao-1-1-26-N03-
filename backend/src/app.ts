import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

const app: Express = express();

// Middlewares bảo mật & phân tích cú pháp
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Health check endpoint
app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Crowdfunding API server is running healthy",
    timestamp: new Date().toISOString(),
  });
});

// Middleware xử lý lỗi tập trung (Global Error Handler)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

export default app;
