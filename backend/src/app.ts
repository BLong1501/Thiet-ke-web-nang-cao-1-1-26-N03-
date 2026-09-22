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

import authRouter from "./modules/auth/auth.routes";
import { verificationRouter } from "./modules/verifications/verification.routes";

// Health check endpoint
app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Crowdfunding API server is running healthy",
    timestamp: new Date().toISOString(),
  });
});

// Đăng ký các phân hệ Routes v1
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/verifications", verificationRouter);

import { sendError } from "./core/utils/response.util";

// Middleware xử lý lỗi tập trung (Global Error Handler)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Đã xảy ra lỗi máy chủ nội bộ";
  return sendError(res, statusCode, message, err.errors);
});

export default app;
