import { Router } from "express";
import { UserRole } from "@prisma/client";
import { reportController } from "./report.controller";
import { authenticate, authorize } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import {
  createReportSchema,
  reportIdParamSchema,
  reportQuerySchema,
  resolveReportSchema,
} from "./report.validation";

/** POST /api/v1/reports — người dùng đã đăng nhập gửi tố giác. */
const reportRouter = Router();
reportRouter.post("/", authenticate, validate(createReportSchema), reportController.create);

/** /api/v1/admin/reports — chỉ ADMIN. */
const adminReportRouter = Router();
adminReportRouter.use(authenticate, authorize(UserRole.ADMIN));
adminReportRouter.get("/", validate({ query: reportQuerySchema }), reportController.list);
adminReportRouter.patch(
  "/:id/resolve",
  validate({ params: reportIdParamSchema, body: resolveReportSchema }),
  reportController.resolve,
);

export { reportRouter, adminReportRouter };
