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
import CampaignSummary from "../components/campaign/CampaignSummary";
import { categoryIcon } from "../components/ui/categoryIcon";
import { imageSources } from "../components/home/homeData";
import DisbursementModal from "../components/campaign/DisbursementModal";
import EarlyClosureModal from "../components/campaign/EarlyClosureModal";
import { LuBanknote } from "react-icons/lu";
import {
  FiCheckCircle,
  FiShield,
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiFileText,
  FiExternalLink,
  FiUser,
  FiPhone,
  FiMapPin,
  FiArrowRight,
  FiEdit3,
  FiMessageSquare,
} from "react-icons/fi";
import toast from "react-hot-toast";
import "./campaign-detail.css";

const PLACEHOLDER = "/campaign-placeholder.svg";

function parseDisbursementNote(note?: string | null) {
  if (!note) return { status: "PENDING", cleanNote: "", bankInfo: null, idCardInfo: null };

  let status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
  if (note.includes("[TRẠNG THÁI: APPROVED]")) status = "APPROVED";
  else if (note.includes("[TRẠNG THÁI: REJECTED]")) status = "REJECTED";

  const bankMatch = note.match(/\[TÀI KHOẢN NHẬN:\s*(.*?)\]/);
  const idMatch = note.match(/\[ĐỊNH DANH CCCD:\s*(.*?)\]/);

  const cleanNote = note
    .replace(/\[TRẠNG THÁI:.*?\]\n?/g, "")
    .replace(/\[TÀI KHOẢN NHẬN:.*?\]\n?/g, "")
    .replace(/\[ĐỊNH DANH CCCD:.*?\]\n?/g, "")
    .replace(/\[ẢNH ĐỊNH DANH:.*?\]\n?/g, "")
    .trim();

  return {
    status,
    bankInfo: bankMatch ? bankMatch[1] : null,
    idCardInfo: idMatch ? idMatch[1] : null,
    cleanNote,
  };
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const result = useRemote(() => campaignApi.getById(id!).then(payload), [id]);
  const [tab, setTab] = useState("story");
  const [donate, setDonate] = useState(false);
  const [report, setReport] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const c = result.data;
  const isCreator = !!c && (c.fundraiserId === user?.id || c.creator?.id === user?.id);
  const owner =
    !!c &&
    (isCreator || user?.role?.toUpperCase() === "ADMIN");

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
              owner={isCreator}
              onDonate={() => setDonate(true)}
              onShare={share}
              onReport={() => setReport(true)}
              onDisburse={() => setDisburseModalOpen(true)}
              onRequestClosure={() => setClosureModalOpen(true)}
            />

            <div className="cd-main">
              {c.closureRequest?.status === "PENDING" && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    padding: "12px 18px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ color: "#b45309", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                    <FiClock size={16} /> Chiến dịch đang có yêu cầu kết thúc sớm chờ Quản trị viên duyệt
                  </div>
                  <div style={{ fontSize: "13px", color: "#78350f", marginTop: "4px" }}>
                    <strong>Lý do gửi:</strong> {c.closureRequest.reason}
                  </div>
                </div>
              )}
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
                  <div style={{ fontSize: "14px", color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <FiShield size={16} /> Khu vực Quản trị & Giải ngân cho Chiến dịch của bạn
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
                      <FiEdit3 size={14} /> Chỉnh sửa thông tin
                    </Link>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setTab("disbursements")}
                      style={{
                        fontSize: "13px",
                        padding: "6px 14px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FiClock size={14} /> Nhật ký giải ngân
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
                  ...(owner ? [{ id: "disbursements", label: "Nhật ký" }] : []),
                ]}
                value={tab}
                onChange={setTab}
              >
                {tab === "story" && (
                  <div className="cd-story">
                    <h2>Câu chuyện chiến dịch</h2>
                    <p className="prose">{c.story}</p>

                    {/* Khối liên kết Nhóm cộng đồng thảo luận: CHỈ xuất hiện khi người chủ chiến dịch gửi kèm link cộng đồng */}
                    {(() => {
                      let commLink: string | null = null;
                      if (c.communityLink && typeof c.communityLink === "string" && c.communityLink.trim()) {
                        commLink = c.communityLink.trim();
                      }
                      if (!commLink && c.beneficiaryInfo) {
                        try {
                          const p = typeof c.beneficiaryInfo === "string" ? JSON.parse(c.beneficiaryInfo) : c.beneficiaryInfo;
                          if (p?.communityLink && typeof p.communityLink === "string" && p.communityLink.trim()) {
                            commLink = p.communityLink.trim();
                          }
                        } catch {}
                      }
                      if (!commLink && c.beneficiaryDetails) {
                        try {
                          const p = typeof c.beneficiaryDetails === "string" ? JSON.parse(c.beneficiaryDetails) : c.beneficiaryDetails;
                          if (p?.communityLink && typeof p.communityLink === "string" && p.communityLink.trim()) {
                            commLink = p.communityLink.trim();
                          }
                        } catch {}
                      }
                      if (!commLink) return null;

                      return (
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
                              <FiMessageSquare size={18} color="#2563eb" />
                              <span>Nhóm Cộng Đồng Chiến Dịch</span>
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
                            to={commLink}
                            className="button primary"
                            style={{
                              textDecoration: "none",
                              padding: "10px 22px",
                              borderRadius: "10px",
                              fontWeight: 600,
                              fontSize: "14px",
                              whiteSpace: "nowrap",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            Vào nhóm cộng đồng <FiArrowRight size={15} />
                          </Link>
                        </div>
                      );
                    })()}

                    {(() => {
                      if (!c.beneficiaryDetails && !c.beneficiaryInfo) return null;
                      const raw = c.beneficiaryDetails || c.beneficiaryInfo;
                      let parsed: any = null;
                      if (typeof raw === "string" && raw.trim().startsWith("{")) {
                        try {
                          parsed = JSON.parse(raw);
                        } catch {}
                      } else if (typeof raw === "object" && raw) {
                        parsed = raw;
                      }

                      if (parsed && (parsed.representativeName || parsed.idCardNumber || parsed.phone || parsed.address)) {
                        return (
                          <div style={{ margin: "20px 0", padding: "16px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                            <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                              <FiUser size={18} color="#0f766e" /> Người thụ hưởng & Đối soát minh bạch
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", fontSize: "14px" }}>
                              {parsed.representativeName && (
                                <div>
                                  <span style={{ color: "#64748b" }}>Đại diện: </span>
                                  <strong>{parsed.representativeName}</strong>
                                </div>
                              )}
                              {parsed.phone && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <FiPhone size={14} color="#64748b" />
                                  <span style={{ color: "#64748b" }}>SĐT: </span>
                                  <strong>{parsed.phone}</strong>
                                </div>
                              )}
                              {parsed.address && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", gridColumn: "1 / -1" }}>
                                  <FiMapPin size={14} color="#64748b" />
                                  <span style={{ color: "#64748b" }}>Địa chỉ: </span>
                                  <span>{parsed.address}</span>
                                </div>
                              )}
                              {parsed.details && (
                                <div style={{ gridColumn: "1 / -1", marginTop: "4px", color: "#334155" }}>
                                  {parsed.details}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (typeof raw === "string" && !raw.trim().startsWith("{")) {
                        return (
                          <>
                            <h3>Người thụ hưởng</h3>
                            <p className="prose">{raw}</p>
                          </>
                        );
                      }
                      return null;
                    })()}
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
                {tab === "disbursements" && owner && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", color: "#0f172a" }}>
                          <FiClock size={20} color="#0f766e" /> Nhật ký mốc thời gian giải ngân
                        </h2>
                        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                          Lịch sử chi tiết các mốc thời gian nộp hồ sơ, thời gian giải ngân và đối soát minh bạch.
                        </p>
                      </div>
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
                          padding: "8px 16px",
                          fontWeight: 600,
                        }}
                      >
                        <LuBanknote size={15} /> Tạo hồ sơ giải ngân mới
                      </button>
                    </div>

                    {c.disbursements?.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {c.disbursements.map((d: RecordData) => {
                          const parsed = parseDisbursementNote(d.note);
                          const isApproved = parsed.status === "APPROVED";
                          const isRejected = parsed.status === "REJECTED";
                          return (
                            <article
                              key={d.id}
                              style={{
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                padding: "20px",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                                    <h3 style={{ margin: 0, fontSize: "17px", color: "#1e293b" }}>{d.title}</h3>
                                    {isApproved && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                                        <FiCheckCircle size={13} /> Đã giải ngân thành công
                                      </span>
                                    )}
                                    {isRejected && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fee2e2", color: "#991b1b", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                                        <FiAlertCircle size={13} /> Hồ sơ bị từ chối
                                      </span>
                                    )}
                                    {!isApproved && !isRejected && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                                        <FiClock size={13} /> Đang đối soát hồ sơ
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f766e" }}>
                                    {formatCurrency(Number(d.amount))}
                                  </div>
                                </div>
                              </div>

                              {/* LỊCH MỐC THỜI GIAN ĐĂNG KÝ VÀ THỜI GIAN GIẢI NGÂN */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                  gap: "12px",
                                  background: "#f8fafc",
                                  padding: "12px 16px",
                                  borderRadius: "8px",
                                  border: "1px solid #f1f5f9",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <FiCalendar size={16} color="#0d9488" />
                                  <div style={{ fontSize: "13px" }}>
                                    <div style={{ color: "#64748b" }}>Thời gian đăng ký giải ngân:</div>
                                    <strong style={{ color: "#1e293b" }}>{formatDate(d.createdAt || d.disbursementDate)}</strong>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <FiClock size={16} color="#2563eb" />
                                  <div style={{ fontSize: "13px" }}>
                                    <div style={{ color: "#64748b" }}>Thời gian giải ngân {isApproved ? "thực tế" : "kỳ vọng"}:</div>
                                    <strong style={{ color: "#1e293b" }}>{formatDate(d.disbursementDate)}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* THÔNG TIN TÀI KHOẢN VÀ CCCD NẾU CÓ */}
                              {(parsed.bankInfo || parsed.idCardInfo) && (
                                <div style={{ fontSize: "13px", color: "#475569", display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {parsed.bankInfo && <div>💳 <strong>Tài khoản nhận:</strong> {parsed.bankInfo}</div>}
                                  {parsed.idCardInfo && <div>🪪 <strong>Định danh người nhận:</strong> {parsed.idCardInfo}</div>}
                                </div>
                              )}

                              {parsed.cleanNote && (
                                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>
                                  {parsed.cleanNote}
                                </p>
                              )}

                              {/* DANH SÁCH CHỨNG TỪ & HÓA ĐƠN */}
                              {Array.isArray(d.proofDocuments) && d.proofDocuments.length > 0 && (
                                <div style={{ marginTop: "4px" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>
                                    Chứng từ & Hóa đơn kèm theo:
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                    {d.proofDocuments.map((url: string, i: number) => (
                                      <a
                                        key={url + i}
                                        href={safeUrl(url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="button secondary"
                                        style={{
                                          fontSize: "12px",
                                          padding: "4px 10px",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "5px",
                                          textDecoration: "none",
                                        }}
                                      >
                                        <FiFileText size={13} /> Chứng từ {i + 1} <FiExternalLink size={12} />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <Empty>
                        Chưa có lịch sử hoặc hồ sơ giải ngân nào. Bấm nút "Tạo hồ sơ giải ngân mới" để bắt đầu quy trình đối soát minh bạch.
                      </Empty>
                    )}
                  </div>
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
          {closureModalOpen && (
            <EarlyClosureModal
              campaign={c}
              onClose={() => setClosureModalOpen(false)}
              onSuccess={() => {
                setClosureModalOpen(false);
                result.reload();
              }}
            />
          )}
        </article>
      )}
    </Page>
  );
}
