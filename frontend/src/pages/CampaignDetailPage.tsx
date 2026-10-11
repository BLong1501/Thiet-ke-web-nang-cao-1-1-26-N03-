import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  campaignApi,
  donationApi,
  formatCurrency,
  formatDate,
  getProgress,
} from "../services/api";
import {
  downloadCsv,
  errorMessage,
  listResult,
  normalizeCampaign,
  payload,
  safeUrl,
  type RecordData,
} from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import {
  Empty,
  Field,
  Notice,
  Page,
  Pager,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import DonationModal from "../components/ui/DonationModal";
import ReportDialog from "../components/ReportDialog";
import toast from "react-hot-toast";
export default function CampaignDetailPage() {
  const { id } = useParams();
  const result = useRemote(() => campaignApi.getById(id!).then(payload), [id]);
  const [tab, setTab] = useState("story");
  const [donate, setDonate] = useState(false);
  const [report, setReport] = useState(false);
  const user = useAuthStore((s) => s.user);
  const c = result.data;
  const owner =
    c && (c.fundraiserId === user?.id || user?.role?.toUpperCase() === "ADMIN");
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết.");
    } catch {
      toast.error(
        "Không sao chép được. Bạn có thể sao chép địa chỉ trên thanh trình duyệt.",
      );
    }
  }
  return (
    <Page
      title={c?.title || "Chi tiết chiến dịch"}
      actions={<Link to="/campaigns">← Tất cả chiến dịch</Link>}
    >
      <RemoteState {...result} />
      {c && (
        <>
          <div className="detail-grid">
            <div>
              <img
                className="campaign-cover"
                src={safeUrl(c.coverImageUrl) || "/campaign-placeholder.svg"}
                alt={c.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/campaign-placeholder.svg";
                }}
              />
              <nav className="tabs" aria-label="Nội dung chiến dịch">
                {[
                  ["story", "Câu chuyện"],
                  ["updates", "Cập nhật"],
                  ["donors", "Đóng góp"],
                  ["transparency", "Minh bạch"],
                  ...(owner ? [["manage", "Quản lý"]] : []),
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={tab === key ? "active" : ""}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div className="panel">
                {tab === "story" && (
                  <>
                    <h2>Câu chuyện chiến dịch</h2>
                    <p className="prose">{c.story}</p>
                    {c.beneficiaryDetails && (
                      <>
                        <h3>Người thụ hưởng</h3>
                        <p>{c.beneficiaryDetails}</p>
                      </>
                    )}
                    {c.media?.length > 0 && (
                      <>
                        <h3>Tài liệu minh chứng</h3>
                        <div className="media-grid">
                          {c.media.map((m: RecordData) =>
                            m.mediaType === "IMAGE" ? (
                              <a
                                href={safeUrl(m.url)}
                                key={m.id}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  loading="lazy"
                                  src={safeUrl(m.url)}
                                  alt={m.caption || "Ảnh minh chứng"}
                                />
                              </a>
                            ) : (
                              <a
                                key={m.id}
                                href={safeUrl(m.url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {m.caption || "Xem tài liệu"}
                              </a>
                            ),
                          )}
                        </div>
                      </>
                    )}
                    {c.charityCommitment?.isAccepted && (
                      <Notice>
                        Người gây quỹ đã cam kết công khai việc sử dụng quỹ.
                      </Notice>
                    )}
                  </>
                )}
                {tab === "updates" && (
                  <>
                    <h2>Nhật ký tiến độ</h2>
                    {c.updates?.length ? (
                      c.updates.map((u: RecordData) => (
                        <article className="timeline-item" key={u.id}>
                          <small>{formatDate(u.createdAt)}</small>
                          <h3>{u.title}</h3>
                          <p className="prose">{u.content}</p>
                          {Array.isArray(u.attachments) &&
                            u.attachments.map((url: string) => (
                              <p key={url}>
                                <a
                                  href={safeUrl(url)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Xem tệp đính kèm
                                </a>
                              </p>
                            ))}
                        </article>
                      ))
                    ) : (
                      <Empty>Chưa có cập nhật tiến độ.</Empty>
                    )}
                  </>
                )}
                {tab === "donors" && <CampaignDonors id={c.id} />}{" "}
                {tab === "transparency" && (
                  <>
                    <div className="section-heading">
                      <h2>Minh bạch sử dụng quỹ</h2>
                      <button
                        className="button secondary"
                        onClick={() =>
                          downloadCsv(
                            `sao-ke-${c.id}.csv`,
                            [
                              "Ngày",
                              "Nội dung",
                              "Số tiền VND",
                              "Ghi chú",
                              "Chứng từ",
                            ],
                            (c.disbursements || []).map((d: RecordData) => [
                              d.disbursementDate,
                              d.title,
                              d.amount,
                              d.note,
                              (d.proofDocuments || []).join(" "),
                            ]),
                          )
                        }
                        disabled={!c.disbursements?.length}
                      >
                        Xuất CSV
                      </button>
                    </div>
                    <p>
                      Tổng giải ngân công khai:{" "}
                      <strong>
                        {formatCurrency(
                          (c.disbursements || []).reduce(
                            (s: number, d: RecordData) => s + Number(d.amount),
                            0,
                          ),
                        )}
                      </strong>
                    </p>
                    {c.disbursements?.length ? (
                      c.disbursements.map((d: RecordData) => (
                        <article className="timeline-item" key={d.id}>
                          <Status value="SUCCESS" />
                          <h3>{d.title}</h3>
                          <p>
                            {formatCurrency(Number(d.amount))} ·{" "}
                            {formatDate(d.disbursementDate)}
                          </p>
                          <p>{d.note}</p>
                          <div className="actions">
                            {Array.isArray(d.proofDocuments) &&
                              d.proofDocuments.map((url: string, i: number) => (
                                <a
                                  key={url}
                                  href={safeUrl(url)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Chứng từ {i + 1} ↗
                                </a>
                              ))}
                          </div>
                        </article>
                      ))
                    ) : (
                      <Empty>Chưa có khoản giải ngân công khai.</Empty>
                    )}
                  </>
                )}
                {tab === "manage" && owner && (
                  <ManageCampaign campaign={c} reload={result.reload} />
                )}
              </div>
            </div>
            <aside className="panel campaign-summary">
              <Status value={c.status} />
              <h2>{formatCurrency(Number(c.currentAmount))}</h2>
              <p>trên mục tiêu {formatCurrency(Number(c.targetAmount))}</p>
              <progress
                max={100}
                value={getProgress(
                  Number(c.currentAmount),
                  Number(c.targetAmount),
                )}
                aria-label="Tiến độ gây quỹ"
              />
              <div className="section-heading">
                <strong>
                  {getProgress(Number(c.currentAmount), Number(c.targetAmount))}
                  % mục tiêu
                </strong>
                <span>{c.daysLeft || 0} ngày còn lại</span>
              </div>
              <p>{c.shortDescription}</p>
              <hr />
              <p>Người gây quỹ</p>
              <strong>{c.fundraiser?.fullName}</strong>
              {c.organizerType === "ORGANIZATION" && (
                <p>{c.organizationName}</p>
              )}
              <p>Kết thúc: {formatDate(c.endDate)}</p>
              {c.rejectionReason && <Notice error>{c.rejectionReason}</Notice>}
              <button
                className="button"
                disabled={
                  c.status !== "ACTIVE" || new Date(c.endDate) <= new Date()
                }
                onClick={() => setDonate(true)}
              >
                {c.status === "ACTIVE" && new Date(c.endDate) > new Date()
                  ? "Đóng góp ngay"
                  : "Hiện chưa nhận đóng góp"}
              </button>
              <button className="button secondary" onClick={share}>
                Sao chép liên kết
              </button>
              {user ? (
                <button
                  className="button secondary"
                  onClick={() => setReport(true)}
                >
                  Báo cáo chiến dịch
                </button>
              ) : (
                <Link to="/login">Đăng nhập để báo cáo nội dung</Link>
              )}
              {owner && ["DRAFT", "PENDING_APPROVAL"].includes(c.status) && (
                <Link
                  className="button secondary"
                  to={`/campaigns/${c.id}/edit`}
                >
                  Chỉnh sửa chiến dịch
                </Link>
              )}
            </aside>
          </div>
          {donate && (
            <DonationModal
              campaign={normalizeCampaign(c)}
              onClose={() => setDonate(false)}
              onSuccess={() => {
                setDonate(false);
                toast.success("Máy chủ đã xác nhận đóng góp. Cảm ơn bạn!");
                result.reload();
              }}
            />
          )}
          {report && (
            <ReportDialog targetId={c.id} onClose={() => setReport(false)} />
          )}
        </>
      )}
    </Page>
  );
}
function CampaignDonors({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const result = useRemote(
    () =>
      donationApi
        .getCampaignDonations(id, { page, limit: 10 })
        .then(listResult),
    [id, page],
  );
  return (
    <>
      <h2>Những tấm lòng đồng hành</h2>
      <RemoteState {...result} />
      {result.data && (
        <>
          {result.data.items.length ? (
            result.data.items.map((d) => (
              <article className="donor-row" key={d.id}>
                <div>
                  <strong>
                    {d.isAnonymous
                      ? "Nhà hảo tâm ẩn danh"
                      : d.donorName || "Nhà hảo tâm"}
                  </strong>
                  <p>{d.message}</p>
                  <small>{formatDate(d.paidAt || d.createdAt)}</small>
                </div>
                <strong>{formatCurrency(Number(d.amount))}</strong>
              </article>
            ))
          ) : (
            <Empty>Chưa có đóng góp được xác nhận.</Empty>
          )}
          <Pager page={page} pages={result.data.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
function ManageCampaign({
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
      <div className="tabs">
        {[
          ["update", "Nhật ký"],
          ["media", "Tài liệu"],
          ["disbursement", "Giải ngân"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={kind === id ? "active" : ""}
            onClick={() => {
              setKind(id);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
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
            <Field label="Số tiền (VND)">
              <input
                name="amount"
                type="number"
                required
                min={10000}
                step={1}
              />
            </Field>
            <Field label="Ngày giải ngân">
              <input name="date" type="date" required />
            </Field>
            <Field label="URL chứng từ công khai, mỗi dòng một URL">
              <textarea name="proof" required rows={3} />
            </Field>
            <Field label="Ghi chú">
              <textarea name="note" maxLength={1000} />
            </Field>
          </>
        )}
        <button className="button" disabled={busy}>
          {busy ? "Đang lưu…" : "Đăng thông tin"}
        </button>
      </form>
    </>
  );
}
