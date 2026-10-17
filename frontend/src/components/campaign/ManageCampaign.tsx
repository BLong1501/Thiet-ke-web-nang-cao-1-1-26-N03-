import { useState, type FormEvent } from "react";
import { campaignApi } from "../../services/api";
import { errorMessage, type RecordData } from "../../services/platform";
import { Field, Notice } from "../ui/WorkspaceUI";
import Tabs from "../ui/Tabs";
import toast from "react-hot-toast";
import { VIETNAM_BANKS } from "../../data/vietnamBanks";
import { FiShield } from "react-icons/fi";
export default function ManageCampaign({
  campaign,
  reload,
}: {
  campaign: RecordData;
  reload: () => void;
}) {
  const [kind, setKind] = useState("update");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const v = (key: string) => String(f.get(key) || "").trim();
    setBusy(true);
    setError("");
    try {
      if (kind === "update")
        await campaignApi.postUpdate(campaign.id, {
          title: v("title"),
          content: v("content"),
        });
      else if (kind === "media")
        await campaignApi.addMedia(campaign.id, {
          mediaType: v("type") as "IMAGE" | "VIDEO" | "DOCUMENT",
          url: v("url"),
          caption: v("title"),
        });
      else
        await campaignApi.addDisbursement(campaign.id, {
          title: v("title"),
          amount: Number(v("amount")),
          disbursementDate: v("date"),
          bankName: v("bankName") || campaign.bankName,
          bankAccountNumber: v("bankAccountNumber") || campaign.bankAccountNumber,
          bankAccountName: v("bankAccountName") || campaign.bankAccountName,
          proofDocuments: v("proof")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          note: v("note"),
        });
      toast.success("Đã lưu thông tin lên máy chủ.");
      form.reset();
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Cập nhật chiến dịch</h2>
      <Tabs
        label="Loại cập nhật"
        tabs={[
          { id: "update", label: "Nhật ký" },
          { id: "media", label: "Tài liệu" },
          { id: "disbursement", label: "Giải ngân" },
        ]}
        value={kind}
        onChange={(id) => {
          setKind(id);
          setError("");
        }}
      >
        <form key={kind} className="form-stack" onSubmit={submit}>
          {error && <Notice error>{error}</Notice>}
          <Field label={kind === "media" ? "Chú thích" : "Tiêu đề"}>
            <input
              name="title"
              required={kind !== "media"}
              minLength={kind === "media" ? 0 : 5}
              maxLength={255}
            />
          </Field>
          {kind === "update" && (
            <Field label="Nội dung cập nhật">
              <textarea name="content" required minLength={20} rows={5} />
            </Field>
          )}
          {kind === "media" && (
            <>
              <Field label="Loại tài liệu">
                <select name="type">
                  <option value="IMAGE">Ảnh</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Tài liệu</option>
                </select>
              </Field>
              <Field label="URL công khai">
                <input name="url" type="url" pattern="https?://.*" required />
              </Field>
            </>
          )}
          {kind === "disbursement" && (
            <>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <FiShield size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "13px", color: "#166534", lineHeight: "1.5" }}>
                  <strong>Cơ chế Đối soát Tài khoản Giải ngân:</strong>
                  <p style={{ margin: "2px 0 0" }}>
                    Vui lòng xác nhận thông tin tài khoản thụ hưởng nhận tiền giải ngân. Hệ thống sẽ đối chiếu với tài khoản bạn đã đăng ký lúc tạo chiến dịch để Quản trị viên duyệt hồ sơ.
                  </p>
                </div>
              </div>

              <Field label="Tiêu đề đợt giải ngân / Mục đích chi">
                <input
                  name="title"
                  required
                  minLength={5}
                  maxLength={255}
                  placeholder="Ví dụ: Đợt 1 - Mua trang thiết bị y tế và hỗ trợ viện phí"
                />
              </Field>

              <div className="form-grid">
                <Field label="Số tiền yêu cầu giải ngân (VND)">
                  <input
                    name="amount"
                    type="number"
                    required
                    min={10000}
                    step={1}
                    placeholder="10000000"
                  />
                </Field>
                <Field label="Ngày giải ngân dự kiến">
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </Field>
              </div>

              <div className="form-grid">
                <Field label="Ngân hàng nhận giải ngân">
                  <select name="bankName" required defaultValue={campaign.bankName || "Ngân hàng Ngoại thương Việt Nam (Vietcombank)"}>
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b.bin} value={b.name}>
                        {b.shortName} - {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Số tài khoản nhận tiền">
                  <input
                    name="bankAccountNumber"
                    required
                    defaultValue={campaign.bankAccountNumber || ""}
                    placeholder="Số tài khoản ngân hàng"
                  />
                </Field>
              </div>

              <Field label="Tên chủ tài khoản thụ hưởng">
                <input
                  name="bankAccountName"
                  required
                  defaultValue={campaign.bankAccountName || ""}
                  placeholder="HỌ VÀ TÊN CHỦ TÀI KHOẢN"
                />
              </Field>

              <Field
                label="URL hóa đơn, chứng từ, biên lai giải ngân (mỗi dòng một link)"
                hint="Dán các đường link hình ảnh hóa đơn đỏ, biên nhận, phiếu thu hợp lệ"
              >
                <textarea
                  name="proof"
                  required
                  rows={3}
                  placeholder="https://example.com/hoa-don-1.jpg&#10;https://example.com/bien-lai-2.jpg"
                />
              </Field>
              <Field label="Ghi chú & Giải trình chi tiết">
                <textarea
                  name="note"
                  maxLength={2000}
                  rows={2}
                  placeholder="Giải trình cụ thể về khoản chi tiêu và cam kết minh bạch..."
                />
              </Field>
            </>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Đang lưu…" : "Gửi hồ sơ giải ngân"}
          </button>
        </form>
      </Tabs>
    </>
  );
}
