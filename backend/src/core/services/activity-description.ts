const descriptions: Record<string, string> = {
  CREATE_CAMPAIGN: "Tạo chiến dịch",
  UPDATE_CAMPAIGN: "Cập nhật chiến dịch",
  APPROVE_CAMPAIGN: "Phê duyệt chiến dịch",
  REJECT_CAMPAIGN: "Từ chối chiến dịch",
  CANCEL_CAMPAIGN: "Hủy chiến dịch",
  CREATE_CATEGORY: "Tạo danh mục",
  UPDATE_CATEGORY: "Cập nhật danh mục",
  DELETE_CATEGORY: "Xóa danh mục",
  CREATE_MEDIA: "Thêm minh chứng chiến dịch",
  CREATE_UPDATE: "Đăng tiến độ chiến dịch",
  CREATE_DISBURSEMENT: "Tạo hồ sơ giải ngân",
  REVIEW_DISBURSEMENT: "Duyệt hồ sơ giải ngân",
  APPROVE_DISBURSEMENT: "Phê duyệt giải ngân",
  REJECT_DISBURSEMENT: "Từ chối giải ngân",
  UPDATE_PROFILE: "Cập nhật hồ sơ cá nhân",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  SUBMIT_KYC: "Gửi hồ sơ xác minh",
  REVIEW_KYC: "Duyệt hồ sơ xác minh",
  UPDATE_USER_STATUS: "Thay đổi trạng thái người dùng",
  COMMUNITY_CREATED: "Tạo cộng đồng",
  UPDATE_MEMBERSHIP: "Thay đổi thành viên cộng đồng",
  CREATE_POST: "Đăng bài viết",
  CREATE_COMMENT: "Gửi bình luận",
  REPORT_SUBMITTED: "Gửi báo cáo vi phạm",
  REPORT_RESOLVED: "Xử lý báo cáo vi phạm",
  CREATE_DONATION: "Tạo khoản quyên góp",
  DONATION_RECEIVED: "Xác nhận quyên góp",
  DEMO_FULL_REFUND: "Hoàn tiền mô phỏng",
  LOGIN_SUCCESS: "Đăng nhập thành công",
  LOGIN_FAILED: "Đăng nhập thất bại",
  UNAUTHORIZED_ACCESS_ATTEMPT: "Từ chối truy cập không đủ quyền",
  IDOR_ATTEMPT_BLOCKED: "Chặn truy cập đối tượng trái phép",
};
export function activityDescription(action: string): string {
  return descriptions[action] ?? `Sự kiện ${action}`;
}
/** Do not expose legacy JSON which may contain payment or identity documents. */
export function safeActivity<T extends { action: string; details?: unknown }>(
  log: T,
) {
  return {
    ...log,
    description: activityDescription(log.action),
    details: { description: activityDescription(log.action) },
  };
}
