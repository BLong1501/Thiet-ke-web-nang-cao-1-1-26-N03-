import { useState, type FormEvent } from "react";
import { campaignApi, formatCurrency } from "../../services/api";
import { errorMessage, type RecordData } from "../../services/platform";
import { Field, Modal, Notice } from "../ui/WorkspaceUI";
import ImageFileField from "../ui/ImageFileField";
import toast from "react-hot-toast";
import { LuClock, LuFileText } from "react-icons/lu";

export default function EarlyClosureModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: RecordData;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const existingRequest = campaign.closureRequest;
  const isPending = existingRequest?.status === "PENDING";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setError("Vui lòng nhập lý do cụ thể (tối thiểu 10 ký tự)");
      return;
    }
    if (!confirmed) {
      setError("Bạn cần xác nhận cam kết trước khi gửi đơn yêu cầu");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const payload: { reason: string; evidenceUrls?: string[] } = {
        reason: reason.trim(),
        evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
      };
      const res = await campaignApi.requestClosure(campaign.id, payload);
      toast.success(res.data?.message || "Đã gửi yêu cầu đóng chiến dịch sớm đến Admin");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Yêu cầu kết thúc sớm chiến dịch" onClose={onClose}>
      {isPending ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Notice tone="warning">
            <strong>Đơn yêu cầu đang chờ phê duyệt:</strong> Bạn đã gửi yêu cầu đóng sớm chiến dịch vào ngày{" "}
            {new Date(existingRequest.requestedAt).toLocaleDateString("vi-VN")}. Ban Quản trị đang tiến hành xem xét và sẽ thông báo kết quả sớm nhất.
          </Notice>
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "#334155" }}>
              <LuFileText style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} />
              Nội dung lý do đã gửi:
            </h4>
            <p style={{ margin: 0, color: "#475569", whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
              {existingRequest.reason}
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button type="button" className="button secondary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "0.875rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.85rem", color: "#166534" }}>Chiến dịch</div>
              <strong style={{ color: "#14532d" }}>{campaign.title}</strong>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#166534" }}>Số tiền hiện tại</div>
              <strong style={{ color: "#15803d", fontSize: "1.1rem" }}>
                {formatCurrency(Number(campaign.currentAmount || 0))}
              </strong>{" "}
              / {formatCurrency(Number(campaign.targetAmount || 0))}
            </div>
          </div>

          <Notice tone="info">
            <strong>Quy định đóng chiến dịch sớm:</strong> Khi chiến dịch được Admin phê duyệt kết thúc sớm, hệ thống sẽ ngừng nhận quyên góp và chuyển trạng thái sang <strong>ĐÃ HOÀN THÀNH</strong>. Bạn có trách nhiệm giải ngân minh bạch toàn bộ số tiền đã nhận.
          </Notice>

          {error && <Notice tone="error">{error}</Notice>}

          <Field label="Lý do kết thúc sớm chiến dịch (*)" hint="Tối thiểu 10 ký tự. Nêu rõ hoàn cảnh (ví dụ: đã đủ kinh phí phẫu thuật, hoàn thành cứu trợ sớm,...)">
            <textarea
              className="input block"
              rows={4}
              required
              minLength={10}
              maxLength={1000}
              placeholder="Ví dụ: Bệnh nhân đã hoàn thành đợt phẫu thuật thuận lợi và xuất viện sớm hơn dự kiến. Gia đình đã đủ chi phí điều trị đợt này nên xin phép kết thúc chiến dịch sớm..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <Field label="Ảnh / Văn bản minh chứng đính kèm (nếu có)" hint="Giấy xuất viện, xác nhận hoàn thành công trình hoặc thông báo từ cơ quan có thẩm quyền.">
            <ImageFileField
              alt="Minh chứng đóng chiến dịch sớm"
              value={evidenceUrl}
              onChange={setEvidenceUrl}
              mode="public"
            />
          </Field>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "0.875rem",
              cursor: "pointer",
              padding: "0.75rem",
              borderRadius: "6px",
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
            }}
          >
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ marginTop: "3px" }}
            />
            <span style={{ color: "#334155" }}>
              Tôi cam kết toàn bộ thông tin và lý do nêu trên là hoàn toàn chính xác. Tôi cam kết sử dụng toàn bộ số tiền đã quyên góp đúng mục đích thiện nguyện và lập hồ sơ chứng từ giải ngân minh bạch.
            </span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
              Hủy
            </button>
            <button
              type="submit"
              className="button"
              disabled={busy || !confirmed || reason.trim().length < 10}
              style={{
                backgroundColor: "#dc2626",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <LuClock aria-hidden="true" />
              {busy ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đóng sớm"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
