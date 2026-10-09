import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

const app: Express = express();

import { xssSanitizer, csrfProtection } from "./core/middleware/security.middleware";

// Middlewares bảo mật & phân tích cú pháp
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Phòng chống XSS: Tự động loại bỏ script và mã độc hại trong body, query, params
app.use(xssSanitizer);

// Phòng chống CSRF: Kiểm tra Origin/Referer và bảo vệ State-changing requests
app.use(csrfProtection);

import authRouter from "./modules/auth/auth.routes";
import { verificationRouter } from "./modules/verifications/verification.routes";
import { profileRouter } from "./modules/profile/profile.routes";
import { campaignRouter } from "./modules/campaigns/campaign.routes";
import { donationRouter } from "./modules/donations/donation.routes";
import { userRouter } from "./modules/users/user.routes";

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
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/campaigns", campaignRouter);
app.use("/api/v1/donations", donationRouter);
app.use("/api/v1/users", userRouter);

import { sendError } from "./core/utils/response.util";

// Middleware xử lý lỗi tập trung (Global Error Handler)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Đã xảy ra lỗi máy chủ nội bộ";
  return sendError(res, statusCode, message, err.errors);
});

export default app;
