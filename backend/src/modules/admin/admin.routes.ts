import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate, authorize } from "../../core/middleware/auth.middleware";
import { getAdminPendingCounts } from "./admin.controller";

export const adminRouter = Router();

adminRouter.use(authenticate, authorize(UserRole.ADMIN));
adminRouter.get("/pending-counts", getAdminPendingCounts);
