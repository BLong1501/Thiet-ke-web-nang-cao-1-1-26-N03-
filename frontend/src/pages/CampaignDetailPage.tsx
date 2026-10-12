import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  campaignApi,
  formatCurrency,
  formatDate,
  getProgress,
} from "../services/api";
import {
  campaignPath,
  downloadCsv,
  normalizeCampaign,
  payload,
  safeUrl,
  type RecordData,
} from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import {
  Empty,
  Notice,
  Page,
  RemoteState,
  Status,
} from "../components/ui/WorkspaceUI";
import Tabs from "../components/ui/Tabs";
import DonationModal from "../components/ui/DonationModal";
import ReportDialog from "../components/ReportDialog";
import CampaignDonors from "../components/campaign/CampaignDonors";
import ManageCampaign from "../components/campaign/ManageCampaign";
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
      description={c?.shortDescription}
      image={c?.coverImageUrl}
      canonicalPath={c ? campaignPath(c) : undefined}
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
              <Tabs
                label="Nội dung chiến dịch"
                tabs={[
                  { id: "story", label: "Câu chuyện" },
                  { id: "updates", label: "Cập nhật" },
                  { id: "donors", label: "Đóng góp" },
                  { id: "transparency", label: "Minh bạch" },
                  ...(owner ? [{ id: "manage", label: "Quản lý" }] : []),
                ]}
                value={tab}
                onChange={setTab}
                panelClassName="panel"
              >
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
              </Tabs>
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
                  to={`${campaignPath(c)}/edit`}
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
