import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { campaignApi, formatCurrency, formatDate } from "../services/api";
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
import CampaignSummary from "../components/campaign/CampaignSummary";
import { categoryIcon } from "../components/ui/categoryIcon";
import { imageSources } from "../components/home/homeData";
import DisbursementModal from "../components/campaign/DisbursementModal";
import { LuBanknote } from "react-icons/lu";
import toast from "react-hot-toast";
import "./campaign-detail.css";

const PLACEHOLDER = "/campaign-placeholder.svg";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const result = useRemote(() => campaignApi.getById(id!).then(payload), [id]);
  const [tab, setTab] = useState("story");
  const [donate, setDonate] = useState(false);
  const [report, setReport] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const c = result.data;
  const owner =
    !!c &&
    (c.fundraiserId === user?.id || user?.role?.toUpperCase() === "ADMIN");

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

  const categoryName =
    typeof c?.category?.name === "string" ? c.category.name : "";
  const categoryId = typeof c?.category?.id === "string" ? c.category.id : "";
  const CategoryIcon = categoryIcon(c?.category?.slug);
  const cover = safeUrl(c?.coverImageUrl) || PLACEHOLDER;
  const sources = imageSources(cover, [720, 1200, 1600]);

  return (
    <Page
      title={c?.title || "Chi tiết chiến dịch"}
      description={c?.shortDescription}
      image={c?.coverImageUrl}
      canonicalPath={c ? campaignPath(c) : undefined}
      heading={c ? "crumb" : "full"}
    >
      <RemoteState
        {...result}
        skeleton={
          <div className="cd" role="status">
            <span className="visually-hidden">Đang tải chiến dịch…</span>
            <span className="skeleton title" />
            <span className="skeleton" />
            <span className="cd-hero skeleton media" aria-hidden="true" />
          </div>
        }
      />
      {c && (
        <article className="cd">
          <header className="cd-header">
            <div className="cd-kicker">
              {categoryName &&
                (categoryId ? (
                  <Link
                    className="cd-category"
                    to={`/campaigns?category=${encodeURIComponent(categoryId)}`}
                  >
                    <CategoryIcon aria-hidden="true" />
                    {categoryName}
                  </Link>
                ) : (
                  <span className="cd-category">
                    <CategoryIcon aria-hidden="true" />
                    {categoryName}
                  </span>
                ))}
              <Status value={c.status} />
            </div>
            <h1 className="cd-title">{c.title}</h1>
            {c.shortDescription && (
              <p className="cd-dek">{c.shortDescription}</p>
            )}
            <ul className="cd-byline">
              <li>
                {c.organizerType === "ORGANIZATION" && c.organizationName
                  ? c.organizationName
                  : c.fundraiser?.fullName || "Người gây quỹ"}
              </li>
              {c.startDate && <li>Bắt đầu {formatDate(c.startDate)}</li>}
              {c.endDate && <li>Kết thúc {formatDate(c.endDate)}</li>}
            </ul>
          </header>

          <div className="cd-layout">
            <figure className="cd-hero">
              <img
                {...sources}
                sizes={
                  sources.srcSet ? "(max-width: 1024px) 100vw, 62vw" : undefined
                }
                alt={c.title}
                width={1200}
                height={675}
                decoding="async"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.onerror = null;
                  img.removeAttribute("srcset");
                  img.src = PLACEHOLDER;
                }}
              />
            </figure>

            <CampaignSummary
              campaign={c}
              signedIn={!!user}
              owner={owner}
              onDonate={() => setDonate(true)}
              onShare={share}
              onReport={() => setReport(true)}
              onDisburse={() => setDisburseModalOpen(true)}
            />

            <div className="cd-main">
              {owner && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "14px", color: "#166534", fontWeight: 600 }}>
                    Khu vực Quản trị & Giải ngân cho Chiến dịch của bạn
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <Link
                      to={`/campaigns/${c.id}/edit`}
                      className="button secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        padding: "6px 14px",
                        textDecoration: "none",
                        color: "#0f766e",
                        borderColor: "#99f6e4",
                        background: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      ✏️ Chỉnh sửa thông tin
                    </Link>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setTab("manage")}
                      style={{ fontSize: "13px", padding: "6px 14px" }}
                    >
                      Quản lý
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => setDisburseModalOpen(true)}
                      style={{
                        background: "#0d9488",
                        borderColor: "#0f766e",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        padding: "6px 14px",
                        fontWeight: 600,
                      }}
                    >
                      <LuBanknote size={15} /> Tạo hồ sơ giải ngân
                    </button>
                  </div>
                </div>
              )}

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
              >
                {tab === "story" && (
                  <div className="cd-story">
                    <h2>Câu chuyện chiến dịch</h2>
                    <p className="prose">{c.story}</p>

                    {/* Khối liên kết Nhóm cộng đồng thảo luận */}
                    <div
                      style={{
                        margin: "24px 0",
                        padding: "18px 22px",
                        background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
                        border: "1px solid #bfdbfe",
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "14px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#1e3a8a",
                            fontSize: "16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>💬 Nhóm Cộng Đồng Chiến Dịch</span>
                        </div>
                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#334155",
                            fontSize: "14px",
                            lineHeight: "1.5",
                          }}
                        >
                          Tham gia giao lưu, xem chia sẻ hình ảnh và theo dõi thông tin trực tiếp cùng người gây quỹ.
                        </p>
                      </div>
                      <Link
                        to={(() => {
                          let link = "/community";
                          try {
                            if (c.beneficiaryInfo) {
                              const parsed = typeof c.beneficiaryInfo === "string" ? JSON.parse(c.beneficiaryInfo) : c.beneficiaryInfo;
                              if (parsed?.communityLink) link = parsed.communityLink;
                            }
                          } catch {}
                          return link;
                        })()}
                        className="button primary"
                        style={{
                          textDecoration: "none",
                          padding: "10px 22px",
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Vào nhóm cộng đồng →
                      </Link>
                    </div>

                    {c.beneficiaryDetails && (
                      <>
                        <h3>Người thụ hưởng</h3>
                        <p className="prose">{c.beneficiaryDetails}</p>
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
                  </div>
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
                {tab === "donors" && <CampaignDonors id={c.id} />}
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
          </div>

          {donate && (
            <DonationModal
              campaign={normalizeCampaign(c)}
              onClose={() => {
                setDonate(false);
                result.reload();
              }}
              onSuccess={() => {
                toast.success("Máy chủ đã xác nhận đóng góp. Cảm ơn bạn!");
                result.reload();
                setTimeout(() => result.reload(), 1000);
              }}
            />
          )}
          {report && (
            <ReportDialog targetId={c.id} onClose={() => setReport(false)} />
          )}
          {disburseModalOpen && (
            <DisbursementModal
              campaign={c}
              onClose={() => setDisburseModalOpen(false)}
              onSuccess={() => {
                setDisburseModalOpen(false);
                result.reload();
              }}
            />
          )}
        </article>
      )}
    </Page>
  );
}
