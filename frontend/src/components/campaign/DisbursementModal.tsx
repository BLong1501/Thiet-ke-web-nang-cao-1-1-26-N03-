import { useState, type FormEvent } from "react";
import { campaignApi, formatCurrency, uploadApi } from "../../services/api";
import { errorMessage, type RecordData } from "../../services/platform";
import { Field, Modal, Notice } from "../ui/WorkspaceUI";
import toast from "react-hot-toast";
import { VIETNAM_BANKS } from "../../data/vietnamBanks";
import {
  FiShield,
  FiUploadCloud,
  FiCheckCircle,
  FiAlertTriangle,
  FiFileText,
  FiUser,
  FiCheck,
  FiLoader,
} from "react-icons/fi";
import { RiBankCardLine } from "react-icons/ri";

export default function DisbursementModal({
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

  // Dữ liệu tài khoản
  const defaultBank = campaign.bankName || "Ngân hàng Ngoại thương Việt Nam (Vietcombank)";
  const defaultAccNumber = campaign.bankAccountNumber || "";
  const defaultAccName = campaign.bankAccountName || "";
  const maxAvailable = Number(campaign.currentAmount || 0);

  const [bankName, setBankName] = useState(defaultBank);
  const [accNumber, setAccNumber] = useState(defaultAccNumber);
  const [accName, setAccName] = useState(defaultAccName);
  const [amount, setAmount] = useState<number | "">("");

  // Ảnh định danh
  const [frontIdUrl, setFrontIdUrl] = useState("");
  const [backIdUrl, setBackIdUrl] = useState("");
  const [selfieIdUrl, setSelfieIdUrl] = useState("");

  // Uploading state
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Chứng từ hóa đơn
  const [proofList, setProofList] = useState<string[]>([]);
  const [proofInput, setProofInput] = useState("");

  // Cam kết
  const [commit1, setCommit1] = useState(false);
  const [commit2, setCommit2] = useState(false);

  // Kiểm tra đối soát với tài khoản ban đầu
  const isDiffAccount = Boolean(
    defaultAccNumber &&
    accNumber &&
    defaultAccNumber.replace(/\s+/g, "") !== accNumber.replace(/\s+/g, "")
  );

  async function handleFileUpload(
    file: File | undefined,
    setUrl: (url: string) => void,
    setLoading: (l: boolean) => void,
    label: string
  ) {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadApi.uploadPublicImage(file);
      if (res?.url) {
        setUrl(res.url);
        toast.success(`Đã tải lên ${label}!`);
      }
    } catch (err) {
      toast.error(errorMessage(err) || `Lỗi tải ${label}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProofFile(file: File | undefined) {
    if (!file) return;
    setUploadingProof(true);
    try {
      const res = await uploadApi.uploadPublicImage(file);
      if (res?.url) {
        setProofList((prev) => [...prev, res.url]);
        toast.success("Đã tải lên chứng từ hóa đơn!");
      }
    } catch (err) {
      toast.error(errorMessage(err) || "Lỗi tải chứng từ");
    } finally {
      setUploadingProof(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    if (!commit1 || !commit2) {
      setError("Vui lòng tích chọn xác nhận cả 2 cam kết pháp lý trước khi nộp hồ sơ.");
      return;
    }

    if (!frontIdUrl || !backIdUrl) {
      setError("Vui lòng tải lên ảnh CCCD cả 2 mặt (Mặt trước và Mặt sau) để xác minh danh tính.");
      return;
    }

    // Tổng hợp chứng từ
    const manualLines = proofInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const validUrls: string[] = [];
    const invalidLines: string[] = [];

    for (const line of manualLines) {
      if (/^https?:\/\//i.test(line)) {
        validUrls.push(line);
      } else {
        invalidLines.push(line);
      }
    }

    if (invalidLines.length > 0 && proofList.length === 0) {
      setError(
        `Dòng "${invalidLines[0]}" trong ô link chứng từ không phải là URL hợp lệ. Link phải bắt đầu bằng http:// hoặc https:// (hoặc bạn có thể bấm "Tải ảnh hóa đơn từ máy tính" ở phía trên).`
      );
      return;
    }

    // Nếu đã có ảnh upload và có dòng text không phải URL, tự động bỏ qua dòng rác đó
    const allProofs = Array.from(new Set([...proofList, ...validUrls]));

    if (allProofs.length === 0) {
      setError("Vui lòng tải lên hoặc dán tối thiểu 1 chứng từ hóa đơn / biên lai / dự toán chi tiêu.");
      return;
    }

    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();

    const numericAmount = Number(amount || f.get("amount"));
    if (!numericAmount || numericAmount < 10000) {
      setError("Số tiền giải ngân tối thiểu là 10.000 VNĐ.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await campaignApi.addDisbursement(campaign.id, {
        title: v("title"),
        amount: numericAmount,
        disbursementDate: v("date"),
        bankName,
        bankAccountNumber: accNumber,
        bankAccountName: accName,
        proofDocuments: allProofs,
        note: v("note"),
        idCardFullName: v("idCardFullName") || accName,
        idCardNumber: v("idCardNumber"),
        idCardIssueDate: v("idCardIssueDate"),
        idCardIssuePlace: v("idCardIssuePlace"),
        idCardPhone: v("idCardPhone"),
        recipientRelationship: v("recipientRelationship") || "Chính chủ chiến dịch",
        idCardFrontUrl: frontIdUrl,
        idCardBackUrl: backIdUrl,
        idCardSelfieUrl: selfieIdUrl,
        legalCommitment: true,
      });

      toast.success("Nộp hồ sơ đề nghị giải ngân thành công! Quản trị viên sẽ tiến hành đối soát.");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err) || "Không thể gửi hồ sơ giải ngân");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Hồ sơ đề nghị giải ngân & Xác minh định danh"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="form-stack" onSubmit={submit} style={{ maxWidth: "780px", margin: "0 auto" }}>
        {error && <Notice error>{error}</Notice>}

        {/* THÔNG TIN CHIẾN DỊCH VÀ SỐ DƯ HIỆN TẠI */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <span style={{ fontSize: "0.82rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Chiến dịch gây quỹ
            </span>
            <h4 style={{ margin: "2px 0 0", color: "#0f172a", fontSize: "1.05rem" }}>{campaign.title}</h4>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Số tiền quỹ đã huy động:</span>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#16a34a" }}>
              {formatCurrency(maxAvailable)}
            </div>
          </div>
        </div>

        {/* THÔNG BÁO QUY ĐỊNH NGHỊ ĐỊNH 93 */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <FiShield size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.85rem", color: "#1e40af", lineHeight: 1.5 }}>
            <strong>Cơ chế Pháp lý & Đối soát Minh bạch (Nghị định 93/2021/NĐ-CP):</strong>
            <p style={{ margin: "2px 0 0" }}>
              Để bảo vệ quyền lợi của nhà hảo tâm và người thụ hưởng, người lập đề nghị giải ngân cần cung cấp chính xác
              thông tin CCCD, tài khoản nhận tiền và hóa đơn chứng từ. Ban Quản trị sẽ đối chiếu kỹ lưỡng trước khi phê duyệt.
            </p>
          </div>
        </div>

        {/* PHẦN 1: ĐỊNH DANH NGƯỜI NHẬN GIẢI NGÂN (CCCD) */}
        <fieldset
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "16px",
            background: "#ffffff",
          }}
        >
          <legend style={{ fontWeight: 700, color: "#1e293b", padding: "0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FiUser color="#2563eb" /> 1. Xác minh Định danh Người nhận tiền (CCCD)
          </legend>

          <div className="form-grid">
            <Field label="Họ và tên người nhận tiền (trên CCCD)">
              <input
                name="idCardFullName"
                required
                defaultValue={accName}
                placeholder="NGUYỄN VĂN A"
                style={{ textTransform: "uppercase" }}
              />
            </Field>

            <Field label="Số CCCD / Hộ chiếu (12 chữ số)">
              <input
                name="idCardNumber"
                required
                pattern="^[0-9]{9,12}$"
                placeholder="00120100xxxx"
              />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Ngày cấp CCCD">
              <input name="idCardIssueDate" type="date" required />
            </Field>

            <Field label="Nơi cấp CCCD">
              <input
                name="idCardIssuePlace"
                required
                defaultValue="Cục Cảnh sát QLHC về TTXH"
                placeholder="Cục Cảnh sát QLHC về TTXH"
              />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Số điện thoại liên hệ chính chủ">
              <input
                name="idCardPhone"
                type="tel"
                required
                pattern="^0[0-9]{9}$"
                placeholder="0987654321"
              />
            </Field>

            <Field label="Mối quan hệ với người thụ hưởng">
              <select name="recipientRelationship" required defaultValue="Chính chủ chiến dịch">
                <option value="Chính chủ chiến dịch">Chính chủ phát động chiến dịch</option>
                <option value="Người thụ hưởng trực tiếp">Người thụ hưởng trực tiếp (Bệnh nhân/Người nhận hỗ trợ)</option>
                <option value="Đại diện hợp pháp của gia đình">Đại diện hợp pháp của gia đình người thụ hưởng</option>
                <option value="Đơn vị cung cấp dịch vụ y tế / Bệnh viện">Đơn vị cung cấp dịch vụ y tế / Bệnh viện</option>
                <option value="Ủy ban / Tổ chức từ thiện địa phương">Ủy ban / Tổ chức từ thiện địa phương</option>
              </select>
            </Field>
          </div>

          {/* UPLOAD ẢNH CCCD 2 MẶT VÀ ẢNH CHÂN DUNG */}
          <div style={{ marginTop: "12px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "8px" }}>
              Tải lên tài liệu định danh (Ảnh chụp rõ nét, không cắt góc, không lóa sáng):
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
              {/* Mặt trước */}
              <div style={{ border: "1px dashed #94a3b8", borderRadius: "10px", padding: "10px", textAlign: "center", background: "#f8fafc" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>CCCD Mặt trước *</span>
                {frontIdUrl ? (
                  <div style={{ marginTop: "6px" }}>
                    <img src={frontIdUrl} alt="CCCD Trước" style={{ width: "100%", maxHeight: "110px", objectFit: "contain", borderRadius: "6px" }} />
                    <button type="button" className="button secondary" style={{ fontSize: "0.75rem", padding: "2px 8px", marginTop: "4px" }} onClick={() => setFrontIdUrl("")}>
                      Đổi ảnh
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: "8px" }}>
                    <label className="button secondary" style={{ fontSize: "0.78rem", padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <FiUploadCloud size={14} /> {uploadingFront ? "Đang tải..." : "Chọn ảnh trước"}
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadingFront} onChange={(e) => handleFileUpload(e.target.files?.[0], setFrontIdUrl, setUploadingFront, "CCCD mặt trước")} />
                    </label>
                  </div>
                )}
              </div>

              {/* Mặt sau */}
              <div style={{ border: "1px dashed #94a3b8", borderRadius: "10px", padding: "10px", textAlign: "center", background: "#f8fafc" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>CCCD Mặt sau *</span>
                {backIdUrl ? (
                  <div style={{ marginTop: "6px" }}>
                    <img src={backIdUrl} alt="CCCD Sau" style={{ width: "100%", maxHeight: "110px", objectFit: "contain", borderRadius: "6px" }} />
                    <button type="button" className="button secondary" style={{ fontSize: "0.75rem", padding: "2px 8px", marginTop: "4px" }} onClick={() => setBackIdUrl("")}>
                      Đổi ảnh
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: "8px" }}>
                    <label className="button secondary" style={{ fontSize: "0.78rem", padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <FiUploadCloud size={14} /> {uploadingBack ? "Đang tải..." : "Chọn ảnh sau"}
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadingBack} onChange={(e) => handleFileUpload(e.target.files?.[0], setBackIdUrl, setUploadingBack, "CCCD mặt sau")} />
                    </label>
                  </div>
                )}
              </div>

              {/* Chân dung cầm CCCD */}
              <div style={{ border: "1px dashed #94a3b8", borderRadius: "10px", padding: "10px", textAlign: "center", background: "#f8fafc" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Chân dung cầm CCCD (hoặc ủy quyền)</span>
                {selfieIdUrl ? (
                  <div style={{ marginTop: "6px" }}>
                    <img src={selfieIdUrl} alt="Chân dung" style={{ width: "100%", maxHeight: "110px", objectFit: "contain", borderRadius: "6px" }} />
                    <button type="button" className="button secondary" style={{ fontSize: "0.75rem", padding: "2px 8px", marginTop: "4px" }} onClick={() => setSelfieIdUrl("")}>
                      Đổi ảnh
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: "8px" }}>
                    <label className="button secondary" style={{ fontSize: "0.78rem", padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <FiUploadCloud size={14} /> {uploadingSelfie ? "Đang tải..." : "Tải ảnh chân dung"}
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadingSelfie} onChange={(e) => handleFileUpload(e.target.files?.[0], setSelfieIdUrl, setUploadingSelfie, "ảnh chân dung")} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {/* PHẦN 2: THÔNG TIN TÀI KHOẢN NGÂN HÀNG ĐỔ TIỀN VỀ */}
        <fieldset
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "16px",
            background: "#ffffff",
          }}
        >
          <legend style={{ fontWeight: 700, color: "#1e293b", padding: "0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <RiBankCardLine color="#16a34a" size={18} /> 2. Tài khoản Ngân hàng nhận tiền giải ngân
          </legend>

          {isDiffAccount && (
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "12px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                color: "#92400e",
                fontSize: "0.85rem",
              }}
            >
              <FiAlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <strong>Lưu ý đối soát:</strong> Tài khoản này khác với tài khoản đã đăng ký ban đầu của chiến dịch ({defaultAccNumber}). Quản trị viên sẽ kiểm tra kỹ văn bản giải trình.
              </div>
            </div>
          )}

          <div className="form-grid">
            <Field label="Ngân hàng nhận tiền">
              <select value={bankName} onChange={(e) => setBankName(e.target.value)} required>
                {VIETNAM_BANKS.map((b) => (
                  <option key={b.bin} value={b.name}>
                    {b.shortName} - {b.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Số tài khoản ngân hàng">
              <input
                value={accNumber}
                onChange={(e) => setAccNumber(e.target.value)}
                required
                placeholder="Số tài khoản ngân hàng"
              />
            </Field>
          </div>

          <Field label="Tên chủ tài khoản thụ hưởng (Phải trùng khớp với CCCD)">
            <input
              value={accName}
              onChange={(e) => setAccName(e.target.value.toUpperCase())}
              required
              placeholder="HỌ VÀ TÊN CHỦ TÀI KHOẢN"
              style={{ textTransform: "uppercase" }}
            />
          </Field>
        </fieldset>

        {/* PHẦN 3: ĐỢT GIẢI NGÂN & CHỨNG TỪ CHI TIÊU */}
        <fieldset
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "16px",
            background: "#ffffff",
          }}
        >
          <legend style={{ fontWeight: 700, color: "#1e293b", padding: "0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FiFileText color="#0d9488" /> 3. Thông tin đợt giải ngân & Chứng từ chi tiêu
          </legend>

          <Field label="Tiêu đề đợt giải ngân / Mục đích chi">
            <input
              name="title"
              required
              minLength={5}
              maxLength={255}
              placeholder="Ví dụ: Đợt 1 - Thanh toán tạm ứng viện phí và thuốc phẫu thuật tim"
            />
          </Field>

          <div className="form-grid">
            <Field label="Số tiền yêu cầu giải ngân (VND)">
              <input
                name="amount"
                type="number"
                required
                min={10000}
                max={maxAvailable || undefined}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
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

          {/* TẢI LÊN CHỨNG TỪ HÓA ĐƠN */}
          <div style={{ marginTop: "10px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
              Hóa đơn đỏ (VAT), Giấy báo viện phí, Phiếu thu, Báo giá hoặc Dự toán chi tiêu *:
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <label
                className="button secondary"
                style={{
                  fontSize: "0.82rem",
                  padding: "6px 14px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiUploadCloud size={16} /> {uploadingProof ? "Đang tải ảnh lên..." : "Tải ảnh hóa đơn từ máy tính"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  disabled={uploadingProof}
                  onChange={(e) => handleAddProofFile(e.target.files?.[0])}
                />
              </label>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Đã có {proofList.length} ảnh hóa đơn đính kèm
              </span>
            </div>

            {proofList.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                {proofList.map((url, idx) => (
                  <div key={url} style={{ position: "relative", width: "70px", height: "70px", border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden" }}>
                    <img src={url} alt={`Hóa đơn ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => setProofList((list) => list.filter((_, i) => i !== idx))}
                      style={{
                        position: "absolute",
                        top: "2px",
                        right: "2px",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Field label="Hoặc dán link chứng từ online (mỗi dòng một link)">
              <textarea
                value={proofInput}
                onChange={(e) => setProofInput(e.target.value)}
                rows={2}
                placeholder="https://example.com/hoa-don-do-1.jpg&#10;https://example.com/phieu-thu-vien-phi-2.jpg"
              />
            </Field>
          </div>

          <Field label="Ghi chú & Giải trình chi tiết mục đích chi">
            <textarea
              name="note"
              rows={2}
              maxLength={2000}
              placeholder="Giải trình cụ thể về các hạng mục chi tiêu, nhà cung cấp hoặc tiến độ điều trị bệnh..."
            />
          </Field>
        </fieldset>

        {/* PHẦN 4: CAM KẾT PHÁP LÝ & TRÁCH NHIỆM */}
        <fieldset
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "16px",
            background: "#f0fdf4",
          }}
        >
          <legend style={{ fontWeight: 700, color: "#166534", padding: "0 8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FiCheckCircle color="#16a34a" /> 4. Cam kết Pháp lý & Minh bạch
          </legend>

          <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer", fontSize: "0.86rem", color: "#166534", marginBottom: "8px" }}>
            <input
              type="checkbox"
              checked={commit1}
              onChange={(e) => setCommit1(e.target.checked)}
              style={{ marginTop: "3px" }}
            />
            <span>
              <strong>Cam kết sử dụng đúng mục đích:</strong> Tôi cam đoan toàn bộ thông tin định danh và tài khoản trên là hoàn toàn chính xác. Số tiền giải ngân sẽ được dùng 100% đúng với mục đích chiến dịch đã công bố và chịu hoàn toàn trách nhiệm trước pháp luật theo quy định tại Nghị định 93/2021/NĐ-CP.
            </span>
          </label>

          <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer", fontSize: "0.86rem", color: "#166534" }}>
            <input
              type="checkbox"
              checked={commit2}
              onChange={(e) => setCommit2(e.target.checked)}
              style={{ marginTop: "3px" }}
            />
            <span>
              <strong>Cam kết nộp báo cáo quyết toán thực tế:</strong> Tôi cam kết sẽ đăng tải hình ảnh sao kê chuyển khoản thực tế, biên bản bàn giao tiền/quà cho người thụ hưởng trong vòng 7 - 14 ngày sau khi nhận được tiền giải ngân.
            </span>
          </label>
        </fieldset>

        {/* NÚT THAO TÁC */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="button"
            disabled={busy || !commit1 || !commit2}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              background: "#16a34a",
              borderColor: "#15803d",
            }}
          >
            {busy ? (
              <>
                <FiLoader className="spin" size={16} /> Đang gửi hồ sơ...
              </>
            ) : (
              <>
                <FiCheck size={16} /> Gửi hồ sơ đề nghị giải ngân
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
