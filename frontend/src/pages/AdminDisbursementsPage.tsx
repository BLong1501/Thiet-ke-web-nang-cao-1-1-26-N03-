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
} from "react-icons/fi";
import { RiBankCardLine } from "react-icons/ri";

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

  return (
    <Page
      title="Quản lý & Thẩm định Giải ngân"
      intro="Theo dõi các đợt giải ngân, đối soát tài khoản thụ hưởng và thẩm định hóa đơn chứng từ minh bạch."
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          className="button secondary"
          onClick={result.reload}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <FiRefreshCw size={15} /> Làm mới danh sách
        </button>

        {rawData && (
          <div style={{ display: "flex", gap: "16px" }}>
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
                            {item.campaign?.bankName || "Chưa cập nhật"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            STK: {item.campaign?.bankAccountNumber || "N/A"}
                          </div>
                          {item.campaign?.bankAccountName && (
                            <div style={{ fontSize: "11px", color: "#475569" }}>
                              ({item.campaign.bankAccountName})
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
                            <FiEye size={14} /> Thẩm định
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

      {/* MODAL THẨM ĐỊNH CHI TIẾT CHỨNG TỪ */}
      {selected && (
        <Modal
          title={`Thẩm định chứng từ giải ngân: ${selected.title}`}
          onClose={() => setSelected(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <small style={{ color: "#64748b" }}>Chiến dịch</small>
                <div style={{ fontWeight: 600 }}>{selected.campaign?.title}</div>
              </div>
              <div>
                <small style={{ color: "#64748b" }}>Số tiền giải ngân</small>
                <div style={{ color: "#0f766e", fontWeight: 700, fontSize: "18px" }}>
                  {formatCurrency(selected.amount)}
                </div>
              </div>
              <div>
                <small style={{ color: "#64748b" }}>Ngày giải ngân</small>
                <div>{formatDate(selected.disbursementDate)}</div>
              </div>
              <div>
                <small style={{ color: "#64748b" }}>Người lập báo cáo</small>
                <div>{selected.creator?.fullName} ({selected.creator?.email})</div>
              </div>
            </div>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "14px",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#166534", marginBottom: "6px" }}>
                <RiBankCardLine size={18} />
                Tài khoản ngân hàng thụ hưởng giải ngân
              </div>
              <div style={{ fontSize: "14px", color: "#166534" }}>
                Ngân hàng: <strong>{selected.campaign?.bankName || "Chưa rõ"}</strong> — STK: <strong>{selected.campaign?.bankAccountNumber || "N/A"}</strong>
                {selected.campaign?.bankAccountName && (
                  <div>Chủ tài khoản: <strong>{selected.campaign.bankAccountName}</strong></div>
                )}
              </div>
            </div>

            {selected.note && (
              <div>
                <strong style={{ display: "block", marginBottom: "4px" }}>Ghi chú giải trình mục đích:</strong>
                <p style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", margin: 0, fontSize: "14px", color: "#334155" }}>
                  {selected.note}
                </p>
              </div>
            )}

            <div>
              <strong style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <FiShield size={16} color="#2563eb" />
                Danh sách hóa đơn & chứng từ minh chứng:
              </strong>
              {Array.isArray(selected.proofDocuments) && selected.proofDocuments.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selected.proofDocuments.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                      }}
                    >
                      <span style={{ fontSize: "13px", wordBreak: "break-all", color: "#1e293b" }}>
                        {url}
                      </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          color: "#2563eb",
                          fontWeight: 500,
                          flexShrink: 0,
                          marginLeft: "12px",
                        }}
                      >
                        <FiExternalLink size={14} /> Mở xem
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#64748b", fontSize: "13px", fontStyle: "italic" }}>
                  Chưa có liên kết chứng từ nào được đính kèm.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button className="button secondary" onClick={() => setSelected(null)}>
                Đóng
              </button>
              <button
                className="button"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => {
                  alert("Chứng từ giải ngân đã được xác nhận hợp lệ trên hệ thống Sổ cái.");
                  setSelected(null);
                }}
              >
                <FiCheckCircle size={16} /> Xác nhận hợp lệ
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
