import { useState } from "react";
import {
  LuCalendar,
  LuClock,
  LuBanknote,
  LuUser,
  LuImage,
  LuShieldCheck,
  LuCheck,
  LuX,
  LuExternalLink,
  LuBuilding2,
  LuEye,
} from "react-icons/lu";
import { formatCurrency, formatDate } from "../../services/api";
import { Modal } from "../ui/WorkspaceUI";

export interface CampaignPreviewData {
  id?: string;
  title: string;
  categoryName?: string;
  shortDescription: string;
  story: string;
  targetAmount: number;
  currentAmount?: number;
  beneficiaryInfo?: string | Record<string, any>;
  startDate?: string;
  endDate?: string;
  coverImageUrl?: string;
  mediaUrls?: string[];
  organizerType?: "INDIVIDUAL" | "ORGANIZATION" | string;
  organizationName?: string;
  taxCode?: string;
  representativeRole?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  fundraiserName?: string;
  fundraiserEmail?: string;
  status?: string;
  isEdited?: boolean;
}

interface CampaignPreviewModalProps {
  data: CampaignPreviewData;
  onClose: () => void;
  onSubmitForApproval?: () => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
  adminActions?: {
    onApprove?: () => void;
    onReject?: () => void;
    viewUrl?: string;
  };
}

export default function CampaignPreviewModal({
  data,
  onClose,
  onSubmitForApproval,
  submitButtonText = "Gửi xét duyệt",
  isSubmitting = false,
  adminActions,
}: CampaignPreviewModalProps) {
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

  // Phân tích thông tin người thụ hưởng
  const beneficiary = (() => {
    if (!data.beneficiaryInfo) return null;
    if (typeof data.beneficiaryInfo === "object") return data.beneficiaryInfo;
    const raw = String(data.beneficiaryInfo).trim();
    if (raw.startsWith("{")) {
      try {
        return JSON.parse(raw);
      } catch {
        return { details: raw };
      }
    }
    return { details: raw };
  })();

  // Tính số ngày gây quỹ
  const durationDays = (() => {
    if (!data.endDate) return null;
    const start = data.startDate ? new Date(data.startDate).getTime() : Date.now();
    const end = new Date(data.endDate).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  })();

  const allImages = [
    ...(data.coverImageUrl ? [{ url: data.coverImageUrl, type: "Ảnh bìa chính" }] : []),
    ...(data.mediaUrls || []).map((url, idx) => ({ url, type: `Ảnh minh chứng #${idx + 1}` })),
  ];

  return (
    <Modal
      title="Bản xem trước chiến dịch (Preview)"
      onClose={onClose}
    >
      <div className="campaign-preview-container" style={{ maxHeight: "78vh", overflowY: "auto", paddingRight: 4 }}>
        {/* Banner huy hiệu thông báo bản xem trước */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "8px 14px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "0.86rem",
            color: "#1e40af",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LuEye size={18} />
            <span>
              <strong>Bản thu nhỏ (Pop-up):</strong> Đây là giao diện hiển thị cho người dùng và Ban quản trị khi xét duyệt.
            </span>
          </div>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              background: data.status === "ACTIVE" ? "#dcfce7" : "#fef3c7",
              color: data.status === "ACTIVE" ? "#166534" : "#92400e",
              fontWeight: 700,
              fontSize: "0.78rem",
            }}
          >
            {data.status === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : "CHỜ DUYỆT / XEM TRƯỚC"}
          </span>
        </div>

        {/* Ảnh bìa chiến dịch */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "240px",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "#f1f5f9",
            marginBottom: "16px",
          }}
        >
          <img
            src={data.coverImageUrl || "/campaign-placeholder.svg"}
            alt={data.title || "Ảnh bìa chiến dịch"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/campaign-placeholder.svg";
            }}
          />
          {data.categoryName && (
            <span
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                background: "rgba(15, 23, 42, 0.82)",
                backdropFilter: "blur(4px)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {data.categoryName}
            </span>
          )}
        </div>

        {/* Tên chiến dịch & Người tạo */}
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "var(--color-heading, #0f172a)",
              lineHeight: 1.35,
              margin: "0 0 6px 0",
            }}
          >
            {data.title || "Chưa đặt tên chiến dịch"}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "0.85rem",
              color: "var(--color-muted, #64748b)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <LuUser size={15} />
              Người gây quỹ: <strong>{data.fundraiserName || "Chủ chiến dịch"}</strong>
              {data.fundraiserEmail && ` (${data.fundraiserEmail})`}
            </span>
            {data.organizerType === "ORGANIZATION" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#f1f5f9",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                <LuBuilding2 size={14} /> Tổ chức: {data.organizationName || "Chưa nhập tên"}
              </span>
            )}
          </div>
        </div>

        {/* Lưới 4 thông số chính: Tiền, Người thụ hưởng, Thời gian, Tài khoản */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* Số tiền mục tiêu */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#059669", fontSize: "0.82rem", fontWeight: 600, marginBottom: 4 }}>
              <LuBanknote size={17} /> MỤC TIÊU GÂY QUỸ
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
              {formatCurrency(Number(data.targetAmount) || 0)}
            </div>
            {data.currentAmount !== undefined && (
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
                Đã nhận: {formatCurrency(Number(data.currentAmount))}
              </div>
            )}
          </div>

          {/* Người thụ hưởng */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#0284c7", fontSize: "0.82rem", fontWeight: 600, marginBottom: 4 }}>
              <LuUser size={17} /> NGƯỜI THỤ HƯỞNG
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
              {beneficiary?.representativeName || beneficiary?.details || "Cộng đồng / Người cần giúp đỡ"}
            </div>
            {beneficiary?.phone && (
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
                SĐT: {beneficiary.phone}
              </div>
            )}
            {beneficiary?.address && (
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
                Đ/c: {beneficiary.address}
              </div>
            )}
          </div>

          {/* Thời gian chiến dịch */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#d97706", fontSize: "0.82rem", fontWeight: 600, marginBottom: 4 }}>
              <LuCalendar size={17} /> THỜI GIAN VẬN ĐỘNG
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
              {data.startDate ? formatDate(data.startDate) : "Hôm nay"} - {data.endDate ? formatDate(data.endDate) : "Chưa chọn"}
            </div>
            {durationDays !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "#b45309", marginTop: 3 }}>
                <LuClock size={13} /> Thời hạn dự kiến: {durationDays} ngày
              </div>
            )}
          </div>

          {/* Tài khoản giải ngân */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7c3aed", fontSize: "0.82rem", fontWeight: 600, marginBottom: 4 }}>
              <LuShieldCheck size={17} /> TÀI KHOẢN NHẬN GIẢI NGÂN
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>
              {data.bankAccountNumber || "Chưa nhập STK"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
              {data.bankName ? data.bankName.slice(0, 30) : "Chưa chọn ngân hàng"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              {data.bankAccountName || ""}
            </div>
          </div>
        </div>

        {/* Mô tả ngắn */}
        <div style={{ marginBottom: "18px" }}>
          <h4
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              color: "#475569",
              margin: "0 0 6px 0",
            }}
          >
            Mô tả ngắn gọn
          </h4>
          <div
            style={{
              padding: "12px 16px",
              background: "#f1f5f9",
              borderRadius: "8px",
              color: "#334155",
              fontSize: "0.92rem",
              lineHeight: 1.55,
              borderLeft: "4px solid #3b82f6",
            }}
          >
            {data.shortDescription || "Chưa có mô tả ngắn."}
          </div>
        </div>

        {/* Câu chuyện chi tiết & Kế hoạch */}
        <div style={{ marginBottom: "20px" }}>
          <h4
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              color: "#475569",
              margin: "0 0 6px 0",
            }}
          >
            Câu chuyện và kế hoạch sử dụng quỹ
          </h4>
          <div
            style={{
              padding: "16px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              color: "#1e293b",
              fontSize: "0.92rem",
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {data.story || "Chưa có nội dung câu chuyện."}
          </div>
        </div>

        {/* Hình ảnh và tài liệu minh chứng */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <h4
              style={{
                fontSize: "0.92rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                color: "#475569",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <LuImage size={17} /> Hình ảnh chiến dịch & Minh chứng ({allImages.length})
            </h4>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              (Bấm vào ảnh để xem kích thước lớn)
            </span>
          </div>

          {allImages.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "10px",
              }}
            >
              {allImages.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    height: "90px",
                    cursor: "pointer",
                    background: "#f8fafc",
                  }}
                  onClick={() => setSelectedZoomImage(img.url)}
                  title={`${img.type} - Bấm để phóng to`}
                >
                  <img
                    src={img.url}
                    alt={img.type}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/campaign-placeholder.svg";
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      fontSize: "0.68rem",
                      padding: "2px 4px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {img.type}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "#94a3b8",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px dashed #cbd5e1",
                fontSize: "0.85rem",
              }}
            >
              Chưa có hình ảnh minh chứng nào được thêm.
            </div>
          )}
        </div>

        {/* Cam kết minh bạch */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "10px 14px",
            borderRadius: "8px",
            color: "#166534",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: "16px",
          }}
        >
          <LuShieldCheck size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Cam kết minh bạch FundTrust:</strong> Mọi khoản ủng hộ qua tài khoản Quỹ trung tâm Napas 247 được lưu vết sổ cái. Tiền chỉ được giải ngân vào tài khoản thụ hưởng khi có chứng từ hợp lệ được phê duyệt.
          </div>
        </div>

        {/* Modal phóng to ảnh minh chứng */}
        {selectedZoomImage && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "rgba(0, 0, 0, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setSelectedZoomImage(null)}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "90vw",
                maxHeight: "90vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedZoomImage}
                alt="Phóng to ảnh"
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  borderRadius: "8px",
                  objectFit: "contain",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedZoomImage(null)}
                style={{
                  position: "absolute",
                  top: "-14px",
                  right: "-14px",
                  background: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <LuX size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer các hành động */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "16px",
          paddingTop: "14px",
          borderTop: "1px solid var(--color-border, #e2e8f0)",
        }}
      >
        <div>
          {adminActions?.viewUrl && (
            <a
              href={adminActions.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="button secondary sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <LuExternalLink size={15} /> Mở toàn trang
            </a>
          )}
        </div>

        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
          >
            Đóng
          </button>

          {/* Nút hành động cho Admin */}
          {adminActions?.onReject && (
            <button
              type="button"
              className="button secondary"
              style={{ color: "#dc2626", borderColor: "#fca5a5" }}
              onClick={() => {
                onClose();
                adminActions.onReject?.();
              }}
            >
              <LuX size={16} /> Từ chối
            </button>
          )}

          {adminActions?.onApprove && (
            <button
              type="button"
              className="button"
              style={{ backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#fff" }}
              onClick={() => {
                onClose();
                adminActions.onApprove?.();
              }}
            >
              <LuCheck size={16} /> Duyệt chiến dịch
            </button>
          )}

          {/* Nút hành động gửi duyệt từ form tạo chiến dịch */}
          {onSubmitForApproval && (
            <button
              type="button"
              className="button"
              disabled={isSubmitting}
              onClick={onSubmitForApproval}
              style={{
                backgroundColor: "#2563eb",
                borderColor: "#2563eb",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <LuCheck size={16} /> {isSubmitting ? "Đang gửi…" : submitButtonText}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

