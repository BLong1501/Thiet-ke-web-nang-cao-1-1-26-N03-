import { useState } from "react";
import { Link } from "react-router-dom";
import { campaignApi, formatCurrency, formatDate } from "../services/api";
import { campaignPath, listResult, type RecordData } from "../services/platform";
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
} from "react-icons/fi";
import { RiBankCardLine } from "react-icons/ri";
import toast from "react-hot-toast";

export default function AdminDisbursementsPage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RecordData | null>(null);

  const result = useRemote(
    () => campaignApi.getAdminDisbursements({ page, limit: 10 }).then(listResult),
    [page],
    { keepPrevious: true }
  );

  const rawData: any = result.data;
  const totalDisbursed = rawData?.totalDisbursed || 0;

  // Trích xuất thông tin ngân hàng giải ngân từ note nếu có định dạng [TÀI KHOẢN NHẬN: ...]
  function parseDisbursementBank(item: RecordData | null) {
    if (!item) return { bankName: "", accountNumber: "", accountName: "", noteContent: "" };
    const rawNote = item.note || "";
    const match = rawNote.match(/\[TÀI KHOẢN NHẬN:\s*(.*?)\s*-\s*STK:\s*(.*?)\s*-\s*TÊN:\s*(.*?)\]/i);
    if (match) {
      return {
        bankName: match[1]?.trim() || item.campaign?.bankName,
        accountNumber: match[2]?.trim() || item.campaign?.bankAccountNumber,
        accountName: match[3]?.trim() || item.campaign?.bankAccountName,
        noteContent: rawNote.replace(match[0], "").trim(),
      };
    }
    return {
      bankName: item.campaign?.bankName || "Chưa cập nhật",
      accountNumber: item.campaign?.bankAccountNumber || "N/A",
      accountName: item.campaign?.bankAccountName || "N/A",
      noteContent: rawNote,
    };
  }

  const parsedBank = parseDisbursementBank(selected);
  const originalAccount = selected?.campaign?.bankAccountNumber?.trim() || "";
  const requestAccount = parsedBank.accountNumber?.trim() || "";
  const isAccountMatched = Boolean(
    originalAccount &&
    requestAccount &&
    originalAccount.replace(/\s+/g, "") === requestAccount.replace(/\s+/g, "")
  );

  return (
    <Page
      title="Quản lý & Đối soát Giải ngân"
      intro="Hệ thống mở 2 nửa màn hình song song: Nửa trái là Hồ sơ yêu cầu giải ngân & Biên lai; Nửa phải là Hồ sơ gốc chiến dịch & Tài khoản đăng ký ban đầu."
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <button
          className="button secondary"
          onClick={result.reload}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <FiRefreshCw size={15} /> Làm mới danh sách
        </button>

        {rawData && (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
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
              Tổng đợt giải ngân: {result.data?.total || 0}
            </div>
          </div>
        )}
      </div>

      <RemoteState {...result} />

      {result.data && (
        <>
          {result.data.items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Chiến dịch</th>
                    <th>Người thực hiện</th>
                    <th>Số tiền giải ngân</th>
                    <th>Ngày giải ngân</th>
                    <th>Tài khoản nhận</th>
                    <th>Chứng từ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((item: RecordData) => {
                    const proofs = Array.isArray(item.proofDocuments)
                      ? item.proofDocuments
                      : [];
                    const bankInfo = parseDisbursementBank(item);
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
                            {bankInfo.bankName}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            STK: {bankInfo.accountNumber}
                          </div>
                          {bankInfo.accountName && (
                            <div style={{ fontSize: "11px", color: "#475569" }}>
                              ({bankInfo.accountName})
                            </div>
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
            <Empty>Chưa có khoản giải ngân nào trong hệ thống.</Empty>
          )}

          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}

      {/* MODAL ĐỐI SOÁT DUYỆT HỒ SƠ SONG SONG (2 NỬA TRÁI - PHẢI) */}
      {selected && (
        <Modal
          title={`Đối soát & Thẩm định Giải ngân Song song`}
          onClose={() => setSelected(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1000px" }}>
            
            {/* THANH ĐỐI SOÁT TRÙNG KHỚP TÀI KHOẢN NGÂN HÀNG */}
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
                  Tài khoản nhận giải ngân TRÙNG KHỚP 100% với Số tài khoản đã đăng ký trong hồ sơ chiến dịch ban đầu ({requestAccount}).
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
                  <strong>CẢNH BÁO ĐỐI SOÁT:</strong> Số tài khoản nhận giải ngân trong đơn này (<code>{requestAccount}</code>) KHÁC với số tài khoản đăng ký lúc tạo chiến dịch (<code>{originalAccount || "Chưa có"}</code>). Quản trị viên cần kiểm tra kỹ giấy ủy quyền hoặc lý do thay đổi trước khi giải ngân.
                </div>
              </div>
            )}

            {/* MÀN HÌNH CHIA ĐÔI 50% - 50% */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              {/* NỬA TRÁI: HỒ SƠ YÊU CẦU GIẢI NGÂN HIỆN TẠI */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "2px solid #0d9488",
                  borderRadius: "10px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #cbd5e1", paddingBottom: "10px" }}>
                  <FiFileText size={20} color="#0d9488" />
                  <strong style={{ fontSize: "16px", color: "#0f766e" }}>
                    NỬA TRÁI: Hồ sơ Yêu cầu Giải ngân
                  </strong>
                </div>

                <div>
                  <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                    Tiêu đề đợt giải ngân
                  </small>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b", marginTop: "2px" }}>
                    {selected.title}
                  </div>
                </div>

                <div style={{ background: "#ccfbf1", padding: "12px", borderRadius: "8px", border: "1px solid #99f6e4" }}>
                  <small style={{ color: "#115e59", fontSize: "12px", fontWeight: 600 }}>
                    Số tiền yêu cầu giải ngân
                  </small>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f766e" }}>
                    {formatCurrency(selected.amount)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#134e4a", marginTop: "2px" }}>
                    Ngày giải ngân: <strong>{formatDate(selected.disbursementDate)}</strong>
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#0f766e", marginBottom: "6px", fontSize: "13px" }}>
                    <RiBankCardLine size={16} />
                    Tài khoản nhận tiền (Khai báo trong đợt này)
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                    <div>Ngân hàng: <strong>{parsedBank.bankName}</strong></div>
                    <div>Số tài khoản: <strong style={{ color: "#0f766e" }}>{parsedBank.accountNumber}</strong></div>
                    <div>Chủ tài khoản: <strong>{parsedBank.accountName}</strong></div>
                  </div>
                </div>

                {parsedBank.noteContent && (
                  <div>
                    <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                      Giải trình mục đích sử dụng
                    </small>
                    <p style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", margin: "4px 0 0", fontSize: "13px", color: "#334155" }}>
                      {parsedBank.noteContent}
                    </p>
                  </div>
                )}

                <div>
                  <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    <FiShield size={13} color="#0d9488" />
                    Hóa đơn & Biên lai giải ngân đính kèm
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
                          <span style={{ fontSize: "12px", wordBreak: "break-all", color: "#1e293b" }}>
                            Chứng từ #{idx + 1}
                          </span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              color: "#0d9488",
                              fontWeight: 600,
                            }}
                          >
                            <FiExternalLink size={13} /> Xem hóa đơn
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
                      Chưa có file chứng từ đính kèm.
                    </div>
                  )}
                </div>
              </div>

              {/* NỬA PHẢI: HỒ SƠ GỐC CHIẾN DỊCH ĐÃ ĐĂNG KÝ BAN ĐẦU */}
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
                    NỬA PHẢI: Hồ sơ Gốc Chiến dịch
                  </strong>
                </div>

                <div>
                  <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                    Tên chiến dịch đã phê duyệt
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
                      <small style={{ color: "#475569", fontSize: "11px" }}>Mục tiêu ban đầu:</small>
                      <div style={{ fontWeight: 600, color: "#334155", fontSize: "15px" }}>
                        {formatCurrency(selected.campaign?.targetAmount || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#1e40af", marginBottom: "6px", fontSize: "13px" }}>
                    <RiBankCardLine size={16} />
                    Tài khoản đăng ký GỐC (Lúc tạo chiến dịch)
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                    <div>Ngân hàng: <strong>{selected.campaign?.bankName || "Chưa cập nhật"}</strong></div>
                    <div>Số tài khoản gốc: <strong style={{ color: "#1e40af" }}>{selected.campaign?.bankAccountNumber || "N/A"}</strong></div>
                    <div>Chủ tài khoản gốc: <strong>{selected.campaign?.bankAccountName || "N/A"}</strong></div>
                  </div>
                </div>

                <div>
                  <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 600 }}>
                    Chủ chiến dịch (Đã xác minh KYC)
                  </small>
                  <div style={{ background: "#fff", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", marginTop: "4px", fontSize: "13px" }}>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{selected.creator?.fullName}</div>
                    <div style={{ color: "#475569" }}>Email: {selected.creator?.email}</div>
                    {selected.creator?.phoneNumber && (
                      <div style={{ color: "#475569" }}>SĐT: {selected.creator.phoneNumber}</div>
                    )}
                  </div>
                </div>

                <div style={{ background: "#f1f5f9", padding: "10px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, marginBottom: "2px" }}>
                    <FiInfo size={14} /> Quy tắc an toàn Quỹ (Escrow Policy):
                  </div>
                  Khoản tiền xin rút ({formatCurrency(selected.amount)}) chỉ được giải ngân từ Tài khoản Quỹ trung tâm (VCB 1020369607) sau khi đối soát thành công chứng từ hóa đơn ở cột bên trái.
                </div>
              </div>
            </div>

            {/* HÀNH ĐỘNG DUYỆT CỦA ADMIN */}
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
              <button className="button secondary" onClick={() => setSelected(null)}>
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
                  onClick={() => {
                    const reason = prompt("Nhập lý do từ chối hồ sơ giải ngân này:");
                    if (reason) {
                      toast.error(`Đã từ chối hồ sơ giải ngân: ${reason}`);
                      setSelected(null);
                    }
                  }}
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
                  onClick={() => {
                    toast.success(
                      `Đã phê duyệt hồ sơ giải ngân ${formatCurrency(selected.amount)} cho chiến dịch "${selected.campaign?.title}".`
                    );
                    setSelected(null);
                  }}
                >
                  <FiCheckCircle size={16} /> Phê duyệt & Xác nhận hợp lệ
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
