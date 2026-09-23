import { Router } from "express";
import { profileController } from "./profile.controller";
import { authenticate } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import { updateProfileSchema, changePasswordSchema } from "./profile.validation";

const router = Router();

// Tất cả các routes trong Profile Module đều yêu cầu đăng nhập
router.use(authenticate);

router.get("/me", profileController.getMyProfile);
router.put("/me", validate(updateProfileSchema), profileController.updateProfile);
router.put("/change-password", validate(changePasswordSchema), profileController.changePassword);

export const profileRouter = router;
