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
import { uploadRouter } from "./modules/uploads/upload.routes";
import { activityLogRouter } from "./modules/activity-logs/activity-log.routes";
import { notificationRouter } from "./modules/notifications/notification.routes";
import { reportRouter, adminReportRouter } from "./modules/reports/report.routes";
import { communityRouter } from "./modules/communities/community.routes";

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
app.use("/api/v1/uploads", uploadRouter);
app.use("/api/v1/activity-logs", activityLogRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/admin/reports", adminReportRouter);
app.use("/api/v1/communities", communityRouter);

import { sendError } from "./core/utils/response.util";

// Middleware xử lý lỗi tập trung (Global Error Handler - Bảo vệ BM9: Không rò rỉ thông tin qua thông báo lỗi)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  
  // Ghi nhật ký chi tiết lỗi tại phía máy chủ
  if (statusCode >= 500) {
    console.error(`[INTERNAL_SERVER_ERROR ${new Date().toISOString()}]:`, err);
  }

  // Trên môi trường production, che giấu hoàn toàn chi tiết lỗi 500 để tránh rò rỉ schema / database / stack trace
  const isProduction = process.env.NODE_ENV === "production";
  const clientMessage =
    statusCode >= 500 && isProduction
      ? "Đã xảy ra lỗi hệ thống nội bộ. Vui lòng thử lại sau hoặc liên hệ ban quản trị."
      : (err.message || "Đã xảy ra lỗi máy chủ nội bộ");

  const errors = isProduction && statusCode >= 500 ? undefined : err.errors;
  return sendError(res, statusCode, clientMessage, errors);
});

export default app;
