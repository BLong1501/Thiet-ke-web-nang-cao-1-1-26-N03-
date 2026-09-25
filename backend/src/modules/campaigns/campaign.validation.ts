import { z } from "zod";
import { CampaignStatus, MediaType } from "@prisma/client";

// Schema tạo chiến dịch
export const createCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Tiêu đề chiến dịch phải có ít nhất 10 ký tự")
    .max(255, "Tiêu đề tối đa 255 ký tự"),
  categoryId: z
    .string()
    .trim()
    .min(1, "Mã danh mục không được để trống")
    .max(50, "Mã danh mục không hợp lệ"),
  shortDescription: z
    .string()
    .trim()
    .min(20, "Mô tả ngắn phải có ít nhất 20 ký tự")
    .max(500, "Mô tả ngắn tối đa 500 ký tự"),
  story: z
    .string()
    .trim()
    .min(50, "Nội dung câu chuyện hoàn cảnh phải có ít nhất 50 ký tự"),
  coverImageUrl: z
    .string()
    .url("Đường dẫn ảnh bìa không hợp lệ"),
  targetAmount: z
    .number()
    .positive("Số tiền mục tiêu phải lớn hơn 0")
    .min(100000, "Số tiền mục tiêu tối thiểu là 100.000 VNĐ"),
  startDate: z
    .string()
    .datetime({ message: "Ngày bắt đầu không đúng định dạng ISO" })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: "Ngày kết thúc không đúng định dạng ISO" }),
  bankAccountNumber: z
    .string()
    .trim()
    .min(6, "Số tài khoản ngân hàng không hợp lệ")
    .max(50, "Số tài khoản ngân hàng tối đa 50 ký tự"),
  bankName: z
    .string()
    .trim()
    .min(2, "Tên ngân hàng tối thiểu 2 ký tự")
    .max(100, "Tên ngân hàng tối đa 100 ký tự"),
  bankAccountName: z
    .string()
    .trim()
    .min(2, "Tên chủ tài khoản tối thiểu 2 ký tự")
    .max(150, "Tên chủ tài khoản tối đa 150 ký tự"),
  beneficiaryInfo: z
    .string()
    .trim()
    .max(1000, "Thông tin người thụ hưởng tối đa 1000 ký tự")
    .optional(),
  status: z
    .enum([CampaignStatus.DRAFT, CampaignStatus.PENDING_APPROVAL], {
      message: "Trạng thái khởi tạo chỉ có thể là DRAFT hoặc PENDING_APPROVAL",
    })
    .default(CampaignStatus.PENDING_APPROVAL),
  media: z
    .array(
      z.object({
        mediaType: z.nativeEnum(MediaType).default(MediaType.IMAGE),
        url: z.string().url("URL minh chứng không hợp lệ"),
        caption: z.string().max(255).optional(),
      })
    )
    .optional(),
});

// Schema cập nhật chiến dịch (khi đang DRAFT hoặc PENDING_APPROVAL)
export const updateCampaignSchema = createCampaignSchema.partial();

// Schema lọc danh sách chiến dịch
export const campaignQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  categoryId: z.string().trim().max(50).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  sortBy: z.enum(["newest", "most_funded", "ending_soon", "target_amount"]).default("newest"),
});

// Schema duyệt chiến dịch (Admin)
export const reviewCampaignSchema = z.object({
  status: z.enum([CampaignStatus.ACTIVE, CampaignStatus.REJECTED], {
    message: "Trạng thái xét duyệt chỉ có thể là ACTIVE hoặc REJECTED",
  }),
  rejectionReason: z.string().trim().max(1000, "Lý do từ chối tối đa 1000 ký tự").optional(),
}).refine(
  (data) => {
    if (data.status === CampaignStatus.REJECTED && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Vui lòng nhập lý do từ chối chiến dịch",
    path: ["rejectionReason"],
  }
);

// Schema thêm ảnh/video minh chứng
export const addMediaSchema = z.object({
  mediaType: z.nativeEnum(MediaType).default(MediaType.IMAGE),
  url: z.string().url("Đường dẫn media không hợp lệ"),
  caption: z.string().max(255, "Chú thích tối đa 255 ký tự").optional(),
});

// Schema tạo nhật ký tiến độ
export const createUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Tiêu đề cập nhật tối thiểu 5 ký tự")
    .max(255, "Tiêu đề tối đa 255 ký tự"),
  content: z
    .string()
    .trim()
    .min(20, "Nội dung cập nhật tối thiểu 20 ký tự"),
  attachments: z.array(z.string().url()).optional(),
});

// Schema tạo/cập nhật danh mục (Admin)
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Tên danh mục tối thiểu 2 ký tự").max(100),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().optional(),
  iconUrl: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignQueryInput = z.infer<typeof campaignQuerySchema>;
export type ReviewCampaignInput = z.infer<typeof reviewCampaignSchema>;
export type AddMediaInput = z.infer<typeof addMediaSchema>;
export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
