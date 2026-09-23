import { Request, Response, NextFunction } from "express";
import { profileService, ProfileService } from "./profile.service";
import { sendSuccess } from "../../core/utils/response.util";

export class ProfileController {
  constructor(private service: ProfileService = profileService) {}

  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const profile = await this.service.getMyProfile(userId);
      return sendSuccess(res, 200, "Lấy thông tin cá nhân thành công", profile);
    } catch (error) {
      return next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.service.updateMyProfile(userId, req.body);
      return sendSuccess(res, 200, result.message, result.user);
    } catch (error) {
      return next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.service.changePassword(userId, req.body);
      return sendSuccess(res, 200, result.message);
    } catch (error) {
      return next(error);
    }
  };
}

export const profileController = new ProfileController();
