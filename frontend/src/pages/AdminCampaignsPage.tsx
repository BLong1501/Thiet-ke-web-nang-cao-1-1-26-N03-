import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LuCheck, LuX, LuEye, LuRotateCw } from "react-icons/lu";
import { api, campaignApi, formatCurrency, formatDate } from "../services/api";
import {
  campaignPath,
  errorMessage,
  listResult,
  payload,
  type RecordData,
} from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import {
  Page,
  Empty,
  Field,
  Modal,
  Notice,
  Pager,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import Tabs from "../components/ui/Tabs";
import toast from "react-hot-toast";

export default function AdminCampaignsPage() {
  const [activeTab, setActiveTab] = useState<
    "pending_new" | "pending_edited" | "closure_requests" | "active" | "other"
  >("pending_new");
  const [page, setPage] = useState(1);
  const [otherStatus, setOtherStatus] = useState("COMPLETED");
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [action, setAction] = useState<
    "ACTIVE" | "REJECTED" | "CANCELLED" | "APPROVE_CLOSURE" | "REJECT_CLOSURE"
  >("ACTIVE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reconciliation, setReconciliation] = useState<RecordData | null>(null);

  // Truy vấn chiến dịch theo tab
  const result = useRemote(
    async () => {
      if (activeTab === "pending_new" || activeTab === "pending_edited") {
        return campaignApi.getPending({ page, limit: 20 }).then(listResult);
      }
      if (activeTab === "closure_requests") {
        return campaignApi
          .getAdminClosureRequests({ page, limit: 10 })
          .then(listResult);
      }
      if (activeTab === "active") {
        return campaignApi
          .getAll({ page, limit: 10, status: "ACTIVE" })
          .then(listResult);
      }
      return campaignApi
        .getAll({
          page,
          limit: 10,
          status: otherStatus === "ALL" ? undefined : otherStatus,
        })
        .then(listResult);
    },
    [page, activeTab, otherStatus],
    { keepPrevious: true }
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (action === "APPROVE_CLOSURE") {
        await campaignApi.reviewClosureRequest(selected.id, {
          status: "APPROVED",
          reviewNote: f.get("reason") ? String(f.get("reason")) : undefined,
        });
        toast.success("Đã phê duyệt đóng chiến dịch sớm thành công. Chiến dịch đã chuyển sang ĐÃ HOÀN THÀNH.");
      } else if (action === "REJECT_CLOSURE") {
        const reason = String(f.get("reason") || "").trim();
        if (!reason) {
          setError("Vui lòng nhập lý do từ chối yêu cầu đóng sớm");
          setBusy(false);
          return;
        }
        await campaignApi.reviewClosureRequest(selected.id, {
          status: "REJECTED",
          reviewNote: reason,
        });
        toast.success("Đã từ chối yêu cầu đóng chiến dịch sớm.");
      } else if (action === "CANCELLED") {
        await api.post(`/donations/campaigns/${selected.id}/cancel`, {
          reason: String(f.get("reason")),
        });
        toast.success("Đã hủy chiến dịch.");
      } else {
        await campaignApi.review(selected.id, {
          status: action as "ACTIVE" | "REJECTED",
          rejectionReason:
            action === "REJECTED" ? String(f.get("reason")) : undefined,
        });
        toast.success(
          action === "ACTIVE"
            ? "Đã phê duyệt chiến dịch thành công."
            : "Đã từ chối chiến dịch."
        );
      }
      setSelected(null);
      result.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function reconcile(id: string) {
    setBusy(true);
    setError("");
    try {
      setReconciliation(
        payload(await api.get(`/donations/campaigns/${id}/reconciliation`))
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Lọc theo tab con cho mục Chờ duyệt mới vs Chờ duyệt chỉnh sửa
  const rawItems = result.data?.items || [];
  const displayItems =
    activeTab === "pending_new"
      ? rawItems.filter((c) => !c.isEdited)
      : activeTab === "pending_edited"
      ? rawItems.filter((c) => c.isEdited)
      : rawItems;

  return (
    <Page
      title="Quản lý & Duyệt chiến dịch"
      intro="Phê duyệt chiến dịch mới tạo, kiểm tra các bản cập nhật chỉnh sửa và giám sát hoạt động."
      actions={
        <button
          className="button secondary"
          onClick={() => result.reload()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <LuRotateCw size={16} /> Làm mới
        </button>
      }
    >
      <Tabs
        label="Phân loại duyệt chiến dịch"
        tabs={[
          { id: "pending_new", label: "Duyệt chiến dịch mới" },
          { id: "pending_edited", label: "Duyệt chiến dịch chỉnh sửa" },
          { id: "closure_requests", label: "Yêu cầu đóng sớm" },
          { id: "active", label: "Đang hoạt động" },
          { id: "other", label: "Trạng thái khác" },
        ]}
        value={activeTab}
        onChange={(tabId) => {
          setActiveTab(tabId as any);
          setPage(1);
        }}
      >
        {activeTab === "other" && (
          <div
            className="filters"
            style={{ marginBottom: "1.25rem", marginTop: "0.5rem" }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.9rem",
              }}
            >
              <strong>Bộ lọc trạng thái:</strong>
              <select
                aria-label="Lọc trạng thái chiến dịch khác"
                value={otherStatus}
                onChange={(e) => {
                  setOtherStatus(e.target.value);
                  setPage(1);
                }}
              >
                {[
                  ["ALL", "Tất cả trạng thái"],
                  ["DRAFT", "Bản nháp"],
                  ["COMPLETED", "Đã hoàn tất"],
                  ["REJECTED", "Bị từ chối"],
                  ["CANCELLED", "Đã bị hủy"],
                ].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <RemoteState {...result} />

        {result.data && (
          <>
            {displayItems.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    {activeTab === "closure_requests" ? (
                      <tr>
                        <th>Chiến dịch</th>
                        <th>Mục tiêu & Đã nhận</th>
                        <th>Lý do yêu cầu đóng sớm</th>
                        <th>Trạng thái duyệt</th>
                        <th style={{ textAlign: "right" }}>Thao tác</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Chiến dịch</th>
                        <th>Mục tiêu gây quỹ</th>
                        <th>Phân loại</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: "right" }}>Thao tác</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {displayItems.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            <Link to={campaignPath(c)}>{c.title}</Link>
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--color-muted)",
                              marginTop: 2,
                            }}
                          >
                            Người gây quỹ:{" "}
                            <strong>
                              {c.fundraiser?.fullName || "Ẩn danh"}
                            </strong>{" "}
                            ({c.fundraiser?.email})
                          </div>
                          {c.isEdited && (
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#b45309",
                                marginTop: 3,
                              }}
                            >
                              🕒 Sửa lúc:{" "}
                              {formatDate(c.lastEditedAt || c.updatedAt)}
                            </div>
                          )}
                        </td>
                        {activeTab === "closure_requests" ? (
                          <>
                            <td>
                              <strong>
                                {formatCurrency(Number(c.targetAmount))}
                              </strong>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#16a34a",
                                  fontWeight: 600,
                                }}
                              >
                                Đã nhận: {formatCurrency(Number(c.currentAmount))} ({c.progressPercentage || 0}%)
                              </div>
                            </td>
                            <td style={{ maxWidth: "320px" }}>
                              <div
                                style={{
                                  fontSize: "0.88rem",
                                  color: "#1e293b",
                                  lineHeight: 1.4,
                                }}
                              >
                                {c.closureRequest?.reason || "Không có lý do"}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  color: "var(--color-muted)",
                                  marginTop: 4,
                                }}
                              >
                                Gửi lúc:{" "}
                                {formatDate(
                                  c.closureRequest?.requestedAt || c.updatedAt
                                )}
                              </div>
                              {c.closureRequest?.evidenceUrls?.[0] && (
                                <a
                                  href={c.closureRequest.evidenceUrls[0]}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#0284c7",
                                    textDecoration: "underline",
                                    display: "inline-block",
                                    marginTop: 3,
                                  }}
                                >
                                  Xem ảnh/chứng từ minh chứng
                                </a>
                              )}
                              {c.closureRequest?.reviewNote && (
                                <div
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#b91c1c",
                                    marginTop: 4,
                                  }}
                                >
                                  Ghi chú phản hồi: {c.closureRequest.reviewNote}
                                </div>
                              )}
                            </td>
                            <td>
                              {c.closureRequest?.status === "PENDING" ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  Chờ duyệt đóng
                                </span>
                              ) : c.closureRequest?.status === "APPROVED" ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  Đã duyệt đóng sớm
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    background: "#fee2e2",
                                    color: "#b91c1c",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  Đã từ chối đóng
                                </span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <strong>
                                {formatCurrency(Number(c.targetAmount))}
                              </strong>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--color-muted)",
                                }}
                              >
                                Hiện có: {formatCurrency(Number(c.currentAmount))}
                              </div>
                            </td>
                            <td>
                              {c.status === "PENDING_APPROVAL" ? (
                                c.isEdited ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      backgroundColor: "#fef3c7",
                                      color: "#92400e",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Đã sửa - Cần duyệt lại
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      backgroundColor: "#e0f2fe",
                                      color: "#0369a1",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Chiến dịch mới
                                  </span>
                                )
                              ) : (
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--color-muted)",
                                  }}
                                >
                                  {c.category?.name || "Cộng đồng"}
                                </span>
                              )}
                            </td>
                            <td>
                              <Status value={c.status} />
                            </td>
                          </>
                        )}
                        <td style={{ textAlign: "right" }}>
                          <div
                            className="actions"
                            style={{
                              display: "inline-flex",
                              gap: 6,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Link
                              className="button secondary sm"
                              to={campaignPath(c)}
                              target="_blank"
                              rel="noreferrer"
                              title="Xem chi tiết chiến dịch"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <LuEye size={15} /> Xem
                            </Link>

                            {activeTab === "closure_requests" ? (
                              c.closureRequest?.status === "PENDING" && (
                                <>
                                  <button
                                    className="button sm"
                                    style={{
                                      backgroundColor: "#16a34a",
                                      borderColor: "#16a34a",
                                      color: "#fff",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                    onClick={() => {
                                      setSelected(c);
                                      setAction("APPROVE_CLOSURE");
                                      setError("");
                                    }}
                                  >
                                    <LuCheck size={15} /> Duyệt đóng
                                  </button>
                                  <button
                                    className="button secondary sm"
                                    style={{
                                      color: "#dc2626",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                    onClick={() => {
                                      setSelected(c);
                                      setAction("REJECT_CLOSURE");
                                      setError("");
                                    }}
                                  >
                                    <LuX size={15} /> Từ chối
                                  </button>
                                </>
                              )
                            ) : (
                              <>
                                {c.status === "PENDING_APPROVAL" && (
                                  <>
                                    <button
                                      className="button sm"
                                      style={{
                                        backgroundColor: "#16a34a",
                                        borderColor: "#16a34a",
                                        color: "#fff",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                      onClick={() => {
                                        setSelected(c);
                                        setAction("ACTIVE");
                                        setError("");
                                      }}
                                    >
                                      <LuCheck size={15} /> Duyệt
                                    </button>
                                    <button
                                      className="button secondary sm"
                                      style={{
                                        color: "#dc2626",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                      onClick={() => {
                                        setSelected(c);
                                        setAction("REJECTED");
                                        setError("");
                                      }}
                                    >
                                      <LuX size={15} /> Từ chối
                                    </button>
                                  </>
                                )}

                                {c.status === "ACTIVE" && (
                                  <button
                                    className="button secondary sm"
                                    style={{ color: "#dc2626" }}
                                    onClick={() => {
                                      setSelected(c);
                                      setAction("CANCELLED");
                                      setError("");
                                    }}
                                  >
                                    Hủy chiến dịch
                                  </button>
                                )}

                                <button
                                  className="button secondary sm"
                                  disabled={busy}
                                  onClick={() => reconcile(c.id)}
                                >
                                  Đối soát
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                {activeTab === "pending_new"
                  ? "Không có chiến dịch mới nào đang chờ duyệt."
                  : activeTab === "pending_edited"
                  ? "Không có chiến dịch chỉnh sửa nào cần duyệt lại."
                  : activeTab === "closure_requests"
                  ? "Không có yêu cầu đóng chiến dịch sớm nào."
                  : activeTab === "active"
                  ? "Không có chiến dịch nào đang hoạt động."
                  : "Không có chiến dịch nào phù hợp với bộ lọc."}
              </Empty>
            )}
            <Pager page={page} pages={result.data.pages} onChange={setPage} />
          </>
        )}
      </Tabs>

      {selected && (
        <Modal
          title={
            action === "APPROVE_CLOSURE"
              ? "Duyệt yêu cầu kết thúc sớm chiến dịch"
              : action === "REJECT_CLOSURE"
              ? "Từ chối yêu cầu kết thúc sớm chiến dịch"
              : action === "ACTIVE"
              ? selected.isEdited
                ? "Phê duyệt lại chiến dịch đã chỉnh sửa"
                : "Phê duyệt chiến dịch mới"
              : action === "REJECTED"
              ? "Từ chối phê duyệt chiến dịch"
              : "Hủy bỏ chiến dịch"
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form className="form-stack" onSubmit={submit}>
            <p>
              <strong>Chiến dịch:</strong> {selected.title}
            </p>
            {error && <Notice error>{error}</Notice>}
            {action === "APPROVE_CLOSURE" ? (
              <>
                <Notice>
                  Xác nhận phê duyệt yêu cầu đóng sớm cho chiến dịch này. Trạng thái chiến dịch sẽ chuyển sang <strong>ĐÃ HOÀN THÀNH</strong> và đóng cổng quyên góp. Chủ chiến dịch sẽ tiến hành thủ tục giải ngân minh bạch.
                </Notice>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", margin: "10px 0" }}>
                  <strong>Lý do xin đóng từ chủ chiến dịch:</strong>
                  <p style={{ margin: "4px 0 0 0", color: "#475569" }}>
                    {selected.closureRequest?.reason || "Không có lý do"}
                  </p>
                </div>
                <Field label="Ghi chú phản hồi cho chủ chiến dịch (tùy chọn)">
                  <textarea
                    name="reason"
                    rows={3}
                    placeholder="Nhập ghi chú phản hồi kèm theo nếu có..."
                    maxLength={1000}
                  />
                </Field>
              </>
            ) : action === "REJECT_CLOSURE" ? (
              <>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", margin: "10px 0" }}>
                  <strong>Lý do xin đóng từ chủ chiến dịch:</strong>
                  <p style={{ margin: "4px 0 0 0", color: "#475569" }}>
                    {selected.closureRequest?.reason || "Không có lý do"}
                  </p>
                </div>
                <Field label="Lý do từ chối yêu cầu đóng sớm (*)">
                  <textarea
                    name="reason"
                    required
                    rows={4}
                    placeholder="Nhập lý do chi tiết từ chối yêu cầu kết thúc sớm để thông báo cho chủ chiến dịch..."
                    minLength={5}
                    maxLength={1000}
                  />
                </Field>
              </>
            ) : action === "ACTIVE" ? (
              <Notice>
                {selected.isEdited
                  ? "Xác nhận các thông tin/hình ảnh chỉnh sửa của chiến dịch này hợp lệ và cho phép tiếp tục gây quỹ."
                  : "Chiến dịch sẽ được công khai và bắt đầu tiếp nhận đóng góp từ cộng đồng."}
              </Notice>
            ) : (
              <Field label="Lý do từ chối / hủy (sẽ gửi thông báo cho chủ chiến dịch)">
                <textarea
                  name="reason"
                  required
                  rows={4}
                  placeholder="Nhập lý do chi tiết để chủ chiến dịch điều chỉnh..."
                  minLength={5}
                  maxLength={action === "CANCELLED" ? 500 : 1000}
                />
              </Field>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Hủy bỏ
              </button>
              <button
                className="button"
                style={{
                  backgroundColor:
                    action === "ACTIVE" || action === "APPROVE_CLOSURE"
                      ? "#16a34a"
                      : "#dc2626",
                  borderColor:
                    action === "ACTIVE" || action === "APPROVE_CLOSURE"
                      ? "#16a34a"
                      : "#dc2626",
                  color: "#fff",
                }}
                disabled={busy}
              >
                {action === "ACTIVE" || action === "APPROVE_CLOSURE"
                  ? "Xác nhận duyệt"
                  : "Xác nhận từ chối"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {reconciliation && (
        <Modal title="Đối soát sổ cái" onClose={() => setReconciliation(null)}>
          <Notice error={!reconciliation.matches}>
            {reconciliation.matches
              ? "Số dư khớp hoàn toàn với sổ cái."
              : "Cảnh báo: Số dư chưa khớp với sổ cái."}
          </Notice>
          <dl className="detail-list">
            {[
              ["received", "Tổng đã nhận"],
              ["refunded", "Tổng đã hoàn"],
              ["net", "Số dư sổ cái thực tế"],
              ["cachedAmount", "Số dư chiến dịch hiển thị"],
            ].map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>{formatCurrency(Number(reconciliation[k]))}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </Page>
  );
}
