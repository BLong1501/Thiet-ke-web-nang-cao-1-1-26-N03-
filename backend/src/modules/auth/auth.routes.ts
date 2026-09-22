import { Router } from "express";
import { authController } from "./auth.controller";
import { registerSchema, loginSchema } from "./auth.validation";
import { validateRequest } from "../../core/middleware/validate.middleware";
import { authenticate } from "../../core/middleware/auth.middleware";

const router: Router = Router();

router.post("/register", validateRequest(registerSchema), authController.register);
router.post("/login", validateRequest(loginSchema), authController.login);
router.get("/me", authenticate, authController.getMe);

export default router;
