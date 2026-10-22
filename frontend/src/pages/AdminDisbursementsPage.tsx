import { useState } from "react";
import { Link } from "react-router-dom";
import { campaignApi, formatCurrency, formatDate } from "../services/api";
import { campaignPath, errorMessage, listResult, safeUrl, type RecordData } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Page,
  Empty,
  Modal,
  Pager,
  RemoteState,
} from "../components/ui/WorkspaceUI";
import {
  FiDollarSign,
  FiFileText,
  FiCalendar,
  FiExternalLink,
  FiUser,
  FiRefreshCw,
  FiEye,
  FiShield,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiInfo,
  FiPhone,
  FiCamera,
  FiFilter,
  FiClock,
} from "react-icons/fi";
import { RiBankCardLine } from "react-icons/ri";
import toast from "react-hot-toast";

interface ParsedDisbursement {
  status: "PENDING" | "APPROVED" | "REJECTED";
  bankName: string;
  accountNumber: string;
  accountName: string;
  idCard: {
    fullName: string;
    idNumber: string;
    issueDate: string;
    issuePlace: string;
    phone: string;
    relationship: string;
  };
  photos: {
    frontUrl: string;
    backUrl: string;
    selfieUrl: string;
  };
  cleanNote: string;
}

function parseDisbursementData(item: RecordData | null): ParsedDisbursement {
  const def: ParsedDisbursement = {
    status: "PENDING",
    bankName: item?.campaign?.bankName || "Chưa cập nhật",
    accountNumber: item?.campaign?.bankAccountNumber || "N/A",
    accountName: item?.campaign?.bankAccountName || "N/A",
    idCard: {
      fullName: item?.creator?.fullName || "",
      idNumber: "",
      issueDate: "",
      issuePlace: "",
      phone: item?.creator?.phoneNumber || "",
      relationship: "Chính chủ tài khoản / Người thụ hưởng",
    },
    photos: {
      frontUrl: "",
      backUrl: "",
      selfieUrl: "",
    },
    cleanNote: item?.note || "",
  };

  if (!item) return def;

  let raw = item.note || "";

  // Parse trạng thái
  const statusMatch = raw.match(/\[TRẠNG THÁI:\s*(PENDING|APPROVED|REJECTED)\]/i);
  if (statusMatch) {
    def.status = statusMatch[1].toUpperCase() as any;
    raw = raw.replace(statusMatch[0], "").trim();
  }

  // Parse tài khoản
  const bankMatch = raw.match(/\[TÀI KHOẢN NHẬN:\s*(.*?)\s*-\s*STK:\s*(.*?)\s*-\s*TÊN:\s*(.*?)\]/i);
  if (bankMatch) {
    def.bankName = bankMatch[1]?.trim() || def.bankName;
    def.accountNumber = bankMatch[2]?.trim() || def.accountNumber;
    def.accountName = bankMatch[3]?.trim() || def.accountName;
    raw = raw.replace(bankMatch[0], "").trim();
  }

  // Parse định danh CCCD
  const idMatch = raw.match(/\[ĐỊNH DANH CCCD:\s*TÊN:\s*(.*?)\s*-\s*SỐ CCCD:\s*(.*?)\s*-\s*NGÀY CẤP:\s*(.*?)\s*-\s*NƠI CẤP:\s*(.*?)\s*-\s*SĐT:\s*(.*?)\s*-\s*QUAN HỆ:\s*(.*?)\]/i);
  if (idMatch) {
    def.idCard = {
      fullName: idMatch[1]?.trim() || def.idCard.fullName,
      idNumber: idMatch[2]?.trim() || "",
      issueDate: idMatch[3]?.trim() || "",
      issuePlace: idMatch[4]?.trim() || "",
      phone: idMatch[5]?.trim() || def.idCard.phone,
      relationship: idMatch[6]?.trim() || def.idCard.relationship,
    };
    raw = raw.replace(idMatch[0], "").trim();
  }

  // Parse ảnh định danh
  const photoMatch = raw.match(/\[ẢNH ĐỊNH DANH:\s*TRƯỚC:\s*(.*?)\s*\|\s*SAU:\s*(.*?)\s*\|\s*CHÂN DUNG:\s*(.*?)\]/i);
  if (photoMatch) {
    const f = photoMatch[1]?.trim();
    const b = photoMatch[2]?.trim();
    const s = photoMatch[3]?.trim();
    def.photos = {
      frontUrl: f && f !== "N/A" ? f : "",
      backUrl: b && b !== "N/A" ? b : "",
      selfieUrl: s && s !== "N/A" ? s : "",
    };
    raw = raw.replace(photoMatch[0], "").trim();
  }

  def.cleanNote = raw;
  return def;
}

import { useAuthStore } from "../store/authStore";

const FALLBACK_CCCD = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190" viewBox="0 0 300 190"><rect width="100%" height="100%" fill="%23f8fafc"/><rect x="10" y="10" width="280" height="170" rx="8" fill="%23ffffff" stroke="%2394a3b8" stroke-width="2" stroke-dasharray="4 4"/><circle cx="65" cy="85" r="28" fill="%23e2e8f0"/><text x="175" y="65" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23334155">GIẤY TỜ ĐỊNH DANH</text><text x="175" y="85" font-family="sans-serif" font-size="10" fill="%2364748b">CCCD / Người thụ hưởng</text><text x="175" y="105" font-family="sans-serif" font-size="10" fill="%230d9488">Hồ sơ đã lưu trên hệ thống</text><text x="150" y="150" font-family="sans-serif" font-size="10" fill="%2394a3b8" text-anchor="middle">Hình ảnh lưu trữ bảo mật</text></svg>`;

export default function AdminDisbursementsPage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [actionBusy, setActionBusy] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const token = useAuthStore((s) => s.token);

  function getImageSrc(rawUrl: string): string {
    if (!rawUrl) return "";
    const cleaned = safeUrl(rawUrl);
    if (token && cleaned.includes("/api/v1/uploads/")) {
      const sep = cleaned.includes("?") ? "&" : "?";
      return `${cleaned}${sep}token=${encodeURIComponent(token)}`;
    }
    return cleaned;
  }

  const result = useRemote(
    () => campaignApi.getAdminDisbursements({ page, limit: 10 }).then(listResult),
    [page],
    { keepPrevious: true }
  );

  const rawData: any = result.data;
  const totalDisbursed = rawData?.totalDisbursed || 0;

  const parsedSelected = parseDisbursementData(selected);
  const originalAccount = selected?.campaign?.bankAccountNumber?.trim() || "";
  const requestAccount = parsedSelected.accountNumber?.trim() || "";
  const isAccountMatched = Boolean(
    originalAccount &&
    requestAccount &&
    originalAccount.replace(/\s+/g, "") === requestAccount.replace(/\s+/g, "")
  );

  // Bộ lọc danh sách hồ sơ
  const filteredItems = (result.data?.items || []).filter((item: RecordData) => {
    if (statusFilter === "ALL") return true;
    const p = parseDisbursementData(item);
    return p.status === statusFilter;
  });

  async function handleApprove() {
    if (!selected) return;
    if (
      !window.confirm(
        `Xác nhận PHÊ DUYỆT hồ sơ giải ngân số tiền ${formatCurrency(
          selected.amount
        )} cho chiến dịch "${selected.campaign?.title}"?`
      )
    ) {
      return;
    }

    setActionBusy(true);
    try {
      await campaignApi.reviewDisbursement(selected.id, {
        status: "APPROVED",
        reviewNote: "Đã đối soát trùng khớp CCCD và chứng từ giải ngân hợp lệ theo Nghị định 93/2021/NĐ-CP.",
      });
      toast.success("Phê duyệt hồ sơ giải ngân thành công!");
      result.reload();
      setSelected(null);
    } catch (err) {
      toast.error(errorMessage(err) || "Lỗi khi phê duyệt hồ sơ giải ngân");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối hồ sơ giải ngân!");
      return;
    }

    setActionBusy(true);
    try {
      await campaignApi.reviewDisbursement(selected.id, {
        status: "REJECTED",
        reviewNote: rejectReason.trim(),
      });
      toast.success("Đã từ chối hồ sơ giải ngân!");
      setRejectDialog(false);
      setRejectReason("");
      result.reload();
      setSelected(null);
    } catch (err) {
      toast.error(errorMessage(err) || "Lỗi khi từ chối hồ sơ");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <Page
      title="Duyệt & Đối soát Hồ sơ Giải ngân"
      intro="Thẩm định thông tin định danh CCCD, đối chiếu tài khoản ngân hàng thụ hưởng và phê duyệt giải ngân từ tài khoản Quỹ trung tâm."
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="button secondary"
            onClick={result.reload}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <FiRefreshCw size={15} /> Làm mới
          </button>

          {/* Bộ lọc trạng thái */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "4px 8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <FiFilter size={14} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#475569" }}>Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e293b",
                cursor: "pointer",
              }}
            >
              <option value="ALL">Tất cả hồ sơ</option>
              <option value="PENDING">Chờ phê duyệt</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="REJECTED">Bị từ chối</option>
            </select>
          </div>
        </div>

        {rawData && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#166534",
                fontWeight: 600,
              }}
            >
              <FiDollarSign size={18} color="#16a34a" />
              Tổng đã giải ngân: {formatCurrency(totalDisbursed)}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#1e40af",
                fontWeight: 600,
              }}
            >
              <FiFileText size={18} color="#2563eb" />
              Tổng hồ sơ: {result.data?.total || 0}
            </div>
          </div>
        )}
      </div>

      <RemoteState {...result} />

      {result.data && (
        <>
          {filteredItems.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Chiến dịch</th>
                    <th>Người thực hiện</th>
                    <th>Số tiền đề nghị</th>
                    <th>Ngày chi</th>
                    <th>Tài khoản nhận</th>
                    <th>Trạng thái</th>
                    <th>Chứng từ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item: RecordData) => {
                    const proofs = Array.isArray(item.proofDocuments)
                      ? item.proofDocuments
                      : [];
                    const parsed = parseDisbursementData(item);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          {item.campaign ? (
                            <Link
                              to={campaignPath(item.campaign)}
                              style={{
                                fontSize: "12px",
                                color: "#2563eb",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                marginTop: "2px",
                              }}
                            >
                              {item.campaign.title} <FiExternalLink size={12} />
                            </Link>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              Chiến dịch đã đóng
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <FiUser size={14} color="#64748b" />
                            <span>{item.creator?.fullName || "Chủ chiến dịch"}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {item.creator?.email}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: "#0f766e", fontSize: "15px" }}>
                            {formatCurrency(item.amount)}
                          </strong>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                            <FiCalendar size={14} color="#64748b" />
                            {formatDate(item.disbursementDate)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "13px", fontWeight: 500 }}>
                            {parsed.bankName}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            STK: <strong>{parsed.accountNumber}</strong>
                          </div>
                          {parsed.accountName && (
                            <div style={{ fontSize: "11px", color: "#475569" }}>
                              ({parsed.accountName})
                            </div>
                          )}
                        </td>
                        <td>
                          {parsed.status === "APPROVED" && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#dcfce7",
                                color: "#166534",
                                border: "1px solid #86efac",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              <FiCheckCircle size={13} /> Đã duyệt
                            </span>
                          )}
                          {parsed.status === "PENDING" && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              <FiClock size={13} /> Chờ duyệt
                            </span>
                          )}
                          {parsed.status === "REJECTED" && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#fee2e2",
                                color: "#991b1b",
                                border: "1px solid #fca5a5",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              <FiXCircle size={13} /> Bị từ chối
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              background: "#f1f5f9",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              color: "#334155",
                            }}
                          >
                            <FiFileText size={13} /> {proofs.length} chứng từ
                          </span>
                        </td>
                        <td>
                          <button
                            className="button secondary"
                            onClick={() => setSelected(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "13px",
                              padding: "6px 12px",
                              fontWeight: 600,
                              borderColor: "#0d9488",
                              color: "#0f766e",
                            }}
                          >
                            <FiEye size={14} /> Đối soát hồ sơ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Không tìm thấy hồ sơ giải ngân nào phù hợp với bộ lọc.</Empty>
          )}

          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}

      {/* MODAL ĐỐI SOÁT HỒ SƠ GIẢI NGÂN CHI TIẾT */}
      {selected && (
        <Modal
          title={`Đối soát & Thẩm định Giải ngân: ${selected.title}`}
          onClose={() => setSelected(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1080px" }}>
            
            {/* CẢNH BÁO / XÁC NHẬN ĐỐI SOÁT TÀI KHOẢN NGÂN HÀNG */}
            {isAccountMatched ? (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FiCheckCircle size={22} color="#16a34a" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: "14px", color: "#166534", fontWeight: 600 }}>
                  Tài khoản thụ hưởng TRÙNG KHỚP 100% với Số tài khoản đã đăng ký trong hồ sơ chiến dịch ban đầu ({requestAccount}).
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde047",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <FiAlertTriangle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "14px", color: "#92400e" }}>
                  <strong>CẢNH BÁO ĐỐI SOÁT TÀI KHOẢN:</strong> Số tài khoản yêu cầu giải ngân (<code>{requestAccount}</code>) KHÁC với số tài khoản đăng ký lúc tạo chiến dịch (<code>{originalAccount || "Chưa có"}</code>). Quản trị viên cần kiểm tra kỹ giấy ủy quyền, CCCD người nhận và lý do thay đổi trước khi giải ngân.
                </div>
              </div>
            )}

            {/* BỐ CỤC 2 CỘT SONG SONG: BÊN TRÁI HỒ SƠ YÊU CẦU & CCCD - BÊN PHẢI HỒ SƠ GỐC CHIẾN DỊCH */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: "20px",
              }}
            >
              {/* CỘT TRÁI: HỒ SƠ YÊU CẦU GIẢI NGÂN & ĐỊNH DANH CCCD */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "2px solid #0d9488",
                  borderRadius: "10px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #cbd5e1", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FiFileText size={20} color="#0d9488" />
                    <strong style={{ fontSize: "16px", color: "#0f766e" }}>
                      Hồ sơ Yêu cầu & Xác minh CCCD
                    </strong>
                  </div>
                  <div>
                    {parsedSelected.status === "APPROVED" && (
                      <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                        ĐÃ PHÊ DUYỆT
                      </span>
                    )}
                    {parsedSelected.status === "PENDING" && (
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                        CHỜ DUYỆT
                      </span>
                    )}
                    {parsedSelected.status === "REJECTED" && (
                      <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                        BỊ TỪ CHỐI
                      </span>
                    )}
                  </div>
                </div>

                {/* SỐ TIỀN & NGÀY CHI */}
                <div style={{ background: "#ccfbf1", padding: "14px", borderRadius: "8px", border: "1px solid #99f6e4" }}>
                  <small style={{ color: "#115e59", fontSize: "12px", fontWeight: 600 }}>
                    Số tiền đề nghị giải ngân
                  </small>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f766e" }}>
                    {formatCurrency(selected.amount)}
                  </div>
                  <div style={{ fontSize: "13px", color: "#134e4a", marginTop: "4px" }}>
                    Ngày giải ngân dự kiến: <strong>{formatDate(selected.disbursementDate)}</strong>
                  </div>
                </div>

                {/* KHỐI 1: XÁC MINH ĐỊNH DANH CCCD */}
                <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#0f766e", marginBottom: "10px", fontSize: "14px" }}>
                    <FiShield size={16} />
                    Thông tin Định danh CCCD Người thụ hưởng / Đại diện
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Họ và tên:</span>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>
                        {parsedSelected.idCard.fullName || selected.creator?.fullName || "Chưa cung cấp"}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Số CCCD:</span>
                      <div style={{ fontWeight: 700, color: "#0f766e", letterSpacing: "0.5px" }}>
                        {parsedSelected.idCard.idNumber || "Chưa có thông tin"}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Ngày cấp:</span>
                      <div>{parsedSelected.idCard.issueDate || "N/A"}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Nơi cấp:</span>
                      <div>{parsedSelected.idCard.issuePlace || "N/A"}</div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Số điện thoại:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <FiPhone size={12} color="#64748b" />
                        <span>{parsedSelected.idCard.phone || "Chưa cung cấp"}</span>
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Mối quan hệ:</span>
                      <div style={{ fontWeight: 500 }}>{parsedSelected.idCard.relationship}</div>
                    </div>
                  </div>

                  {/* ẢNH CCCD 2 MẶT & ẢNH CHÂN DUNG */}
                  <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                      <FiCamera size={15} color="#0d9488" />
                      Ảnh giấy tờ định danh đã tải lên:
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {/* Mặt trước */}
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <small style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                          CCCD Mặt trước
                        </small>
                        {parsedSelected.photos.frontUrl ? (
                          <div>
                            <img
                              src={getImageSrc(parsedSelected.photos.frontUrl)}
                              alt="CCCD Mặt trước"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FALLBACK_CCCD;
                              }}
                              onClick={() => setPreviewImage({
                                url: getImageSrc(parsedSelected.photos.frontUrl),
                                title: "CCCD Mặt trước - " + parsedSelected.idCard.fullName,
                              })}
                              style={{ width: "100%", height: "85px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e2e8f0", cursor: "pointer" }}
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewImage({
                                url: getImageSrc(parsedSelected.photos.frontUrl),
                                title: "CCCD Mặt trước - " + parsedSelected.idCard.fullName,
                              })}
                              style={{ background: "none", border: "none", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#2563eb", marginTop: "4px", cursor: "pointer", padding: 0 }}
                            >
                              <FiExternalLink size={10} /> Xem phóng to
                            </button>
                          </div>
                        ) : (
                          <div style={{ height: "85px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "11px" }}>
                            Chưa có ảnh
                          </div>
                        )}
                      </div>

                      {/* Mặt sau */}
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <small style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                          CCCD Mặt sau
                        </small>
                        {parsedSelected.photos.backUrl ? (
                          <div>
                            <img
                              src={getImageSrc(parsedSelected.photos.backUrl)}
                              alt="CCCD Mặt sau"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FALLBACK_CCCD;
                              }}
                              onClick={() => setPreviewImage({
                                url: getImageSrc(parsedSelected.photos.backUrl),
                                title: "CCCD Mặt sau - " + parsedSelected.idCard.fullName,
                              })}
                              style={{ width: "100%", height: "85px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e2e8f0", cursor: "pointer" }}
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewImage({
                                url: getImageSrc(parsedSelected.photos.backUrl),
                                title: "CCCD Mặt sau - " + parsedSelected.idCard.fullName,
                              })}
                              style={{ background: "none", border: "none", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#2563eb", marginTop: "4px", cursor: "pointer", padding: 0 }}
                            >
                              <FiExternalLink size={10} /> Xem phóng to
                            </button>
                          </div>
                        ) : (
                          <div style={{ height: "85px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "11px" }}>
                            Chưa có ảnh
                          </div>
                        )}
                      </div>

                      {/* Chân dung */}
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px", background: "#f8fafc", textAlign: "center" }}>
                        <small style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                          Ảnh Chân dung / Thụ hưởng
                        </small>
                        {parsedSelected.photos.selfieUrl ? (
                          <div>
                            <img
                              src={getImageSrc(parsedSelected.photos.selfieUrl)}
                              alt="Ảnh chân dung"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FALLBACK_CCCD;
                              }}
                              onClick={() => setPreviewImage({
                                url: getImageSrc(parsedSelected.photos.selfieUrl),
                                title: "Ảnh chân dung - " + parsedSelected.idCard.fullName,
                              })}
                              style={{ width: "100%", height: "85px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e2e8f0", cursor: "pointer" }}
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewImage({
                                url: getImageSrc(parsedSelected.photos.selfieUrl),
                                title: "Ảnh chân dung - " + parsedSelected.idCard.fullName,
                              })}
                              style={{ background: "none", border: "none", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#2563eb", marginTop: "4px", cursor: "pointer", padding: 0 }}
                            >
                              <FiExternalLink size={10} /> Xem phóng to
                            </button>
                          </div>
                        ) : (
                          <div style={{ height: "85px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "11px" }}>
                            Chưa có ảnh
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KHỐI 2: TÀI KHOẢN NHẬN TIỀN */}
                <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#0f766e", marginBottom: "8px", fontSize: "13px" }}>
                    <RiBankCardLine size={16} />
                    Tài khoản Ngân hàng Thụ hưởng (Khai báo đợt này)
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                    <div>Ngân hàng: <strong>{parsedSelected.bankName}</strong></div>
                    <div>Số tài khoản: <strong style={{ color: "#0f766e" }}>{parsedSelected.accountNumber}</strong></div>
                    <div>Chủ tài khoản: <strong>{parsedSelected.accountName}</strong></div>
                  </div>
                </div>

                {/* KHỐI 3: GIẢI TRÌNH MỤC ĐÍCH & CHỨNG TỪ */}
                {parsedSelected.cleanNote && (
                  <div>
                    <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                      Giải trình mục đích sử dụng quỹ
                    </small>
                    <p style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", margin: "4px 0 0", fontSize: "13px", color: "#334155", whiteSpace: "pre-line" }}>
                      {parsedSelected.cleanNote}
                    </p>
                  </div>
                )}

                <div>
                  <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    <FiShield size={13} color="#0d9488" />
                    Hóa đơn đỏ, Phiếu thu & Chứng từ đính kèm
                  </small>
                  {Array.isArray(selected.proofDocuments) && selected.proofDocuments.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                      {selected.proofDocuments.map((url: string, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: 500 }}>
                            Chứng từ chi tiêu #{idx + 1}
                          </span>
                          <a
                            href={safeUrl(url)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              color: "#0d9488",
                              fontWeight: 600,
                            }}
                          >
                            <FiExternalLink size={13} /> Mở xem tài liệu
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
                      Chưa có file chứng từ hóa đơn đính kèm.
                    </div>
                  )}
                </div>
              </div>

              {/* CỘT PHẢI: HỒ SƠ GỐC CHIẾN DỊCH & QUY CHUẨN ĐỐI SOÁT */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "2px solid #2563eb",
                  borderRadius: "10px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #cbd5e1", paddingBottom: "10px" }}>
                  <FiShield size={20} color="#2563eb" />
                  <strong style={{ fontSize: "16px", color: "#1e40af" }}>
                    Hồ sơ Gốc Đăng ký Ban đầu
                  </strong>
                </div>

                <div>
                  <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                    Tên chiến dịch gây quỹ
                  </small>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                    {selected.campaign?.title || "Không xác định"}
                  </div>
                  {selected.campaign && (
                    <Link
                      to={campaignPath(selected.campaign)}
                      target="_blank"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "#2563eb",
                        marginTop: "2px",
                      }}
                    >
                      Mở trang chiến dịch công khai <FiExternalLink size={12} />
                    </Link>
                  )}
                </div>

                <div style={{ background: "#dbeafe", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <small style={{ color: "#1e40af", fontSize: "12px", fontWeight: 600 }}>
                    Tình trạng tài chính Quỹ chiến dịch
                  </small>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <div>
                      <small style={{ color: "#475569", fontSize: "11px" }}>Đã quyên góp:</small>
                      <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "15px" }}>
                        {formatCurrency(selected.campaign?.currentAmount || 0)}
                      </div>
                    </div>
                    <div>
                      <small style={{ color: "#475569", fontSize: "11px" }}>Mục tiêu:</small>
                      <div style={{ fontWeight: 600, color: "#334155", fontSize: "15px" }}>
                        {formatCurrency(selected.campaign?.targetAmount || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#1e40af", marginBottom: "6px", fontSize: "13px" }}>
                    <RiBankCardLine size={16} />
                    Tài khoản GỐC đăng ký (Lúc tạo chiến dịch)
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                    <div>Ngân hàng: <strong>{selected.campaign?.bankName || "Chưa cập nhật"}</strong></div>
                    <div>Số tài khoản: <strong style={{ color: "#1e40af" }}>{selected.campaign?.bankAccountNumber || "N/A"}</strong></div>
                    <div>Chủ tài khoản: <strong>{selected.campaign?.bankAccountName || "N/A"}</strong></div>
                  </div>
                </div>

                <div>
                  <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                    Chủ chiến dịch (Người khởi tạo)
                  </small>
                  <div style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", marginTop: "4px", fontSize: "13px" }}>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{selected.creator?.fullName}</div>
                    <div style={{ color: "#475569" }}>Email: {selected.creator?.email}</div>
                    {selected.creator?.phoneNumber && (
                      <div style={{ color: "#475569" }}>SĐT: {selected.creator.phoneNumber}</div>
                    )}
                  </div>
                </div>

                <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "6px", fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
                    <FiInfo size={14} color="#0284c7" /> Quy định Escrow & Nghị định 93/2021/NĐ-CP:
                  </div>
                  Khoản tiền xin rút ({formatCurrency(selected.amount)}) chỉ được giải ngân từ Tài khoản Quỹ trung tâm sau khi Quản trị viên đối soát CCCD hợp pháp và hóa đơn đỏ trùng khớp.
                </div>
              </div>
            </div>

            {/* THANH HÀNH ĐỘNG DUYỆT CỦA ADMIN */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "16px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <button
                className="button secondary"
                onClick={() => setSelected(null)}
                disabled={actionBusy}
              >
                Đóng màn hình
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="button"
                  style={{
                    background: "#ef4444",
                    borderColor: "#dc2626",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  disabled={actionBusy}
                  onClick={() => setRejectDialog(true)}
                >
                  <FiXCircle size={16} /> Từ chối hồ sơ
                </button>

                <button
                  className="button"
                  style={{
                    background: "#16a34a",
                    borderColor: "#15803d",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  disabled={actionBusy}
                  onClick={handleApprove}
                >
                  <FiCheckCircle size={16} /> {actionBusy ? "Đang xử lý…" : "Phê duyệt & Xác nhận hợp lệ"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DIALOG NHẬP LÝ DO TỪ CHỐI */}
      {rejectDialog && selected && (
        <Modal title="Từ chối hồ sơ giải ngân" onClose={() => setRejectDialog(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: "400px" }}>
            <p style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
              Vui lòng nêu rõ lý do từ chối hồ sơ giải ngân để thông báo cho chủ chiến dịch bổ sung hoặc sửa đổi:
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh CCCD bị mờ góc không nhìn rõ số định danh; Hóa đơn chưa có dấu mộc đỏ của bệnh viện..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setRejectDialog(false)}
                disabled={actionBusy}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="button"
                style={{ background: "#ef4444", borderColor: "#dc2626" }}
                onClick={handleReject}
                disabled={actionBusy}
              >
                {actionBusy ? "Đang từ chối…" : "Xác nhận Từ chối"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {previewImage && (
        <Modal
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        >
          <div style={{ textAlign: "center", padding: "10px" }}>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_CCCD;
              }}
              style={{
                maxWidth: "100%",
                maxHeight: "75vh",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                objectFit: "contain",
              }}
            />
            <div style={{ marginTop: "14px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="button secondary sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FiExternalLink size={14} /> Mở ảnh trong tab mới
              </a>
              <button
                type="button"
                className="button sm"
                onClick={() => setPreviewImage(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
