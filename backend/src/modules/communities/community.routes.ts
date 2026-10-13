import { Router } from "express";
import { communityController } from "./community.controller";
import { authenticate, optionalAuthenticate } from "../../core/middleware/auth.middleware";
import { validate } from "../../core/middleware/validate.middleware";
import {
  communityListQuerySchema,
  communityParamsSchema,
  createCommentSchema,
  createCommunitySchema,
  createPostSchema,
  postParamsSchema,
} from "./community.validation";

const router = Router();
const list = validate({ query: communityListQuerySchema });

// Công khai (nếu có token thì trả thêm isJoined/isLiked)
router.get("/", optionalAuthenticate, list, communityController.list);
router.get(
  "/:id/posts",
  optionalAuthenticate,
  validate({ params: communityParamsSchema, query: communityListQuerySchema }),
  communityController.listPosts,
);
router.get(
  "/:id/posts/:postId/comments",
  optionalAuthenticate,
  validate({ params: postParamsSchema, query: communityListQuerySchema }),
  communityController.listComments,
);

// Yêu cầu đăng nhập
router.post("/", authenticate, validate(createCommunitySchema), communityController.create);
router.post(
  "/:id/join",
  authenticate,
  validate({ params: communityParamsSchema }),
  communityController.join,
);
router.post(
  "/:id/posts",
  authenticate,
  validate({ params: communityParamsSchema, body: createPostSchema }),
  communityController.createPost,
);
router.post(
  "/:id/posts/:postId/like",
  authenticate,
  validate({ params: postParamsSchema }),
  communityController.toggleLike,
);
router.post(
  "/:id/posts/:postId/comments",
  authenticate,
  validate({ params: postParamsSchema, body: createCommentSchema }),
  communityController.createComment,
);

export default router;
export { router as communityRouter };
