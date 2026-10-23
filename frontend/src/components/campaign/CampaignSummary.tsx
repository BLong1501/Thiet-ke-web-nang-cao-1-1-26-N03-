import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { LuCalendarClock, LuFlag, LuShare2, LuUsers, LuBanknote } from "react-icons/lu";
import { formatCurrency, formatDate, getProgress } from "../../services/api";
import { campaignPath, type RecordData } from "../../services/platform";
import { Meter, Notice, Status } from "../ui/WorkspaceUI";

export function isAcceptingDonations(campaign: RecordData): boolean {
  if (campaign.status !== "ACTIVE") return false;
  if (campaign.isEnded === true) return false;
  const end = campaign.endDate ? new Date(campaign.endDate) : null;
  return !end || end > new Date();
}

/** Chỉ lấy `donorCount` máy chủ đã đồng bộ từ giao dịch thành công. */
export function confirmedSupporters(campaign: RecordData): number | undefined {
  if (campaign.donorCount == null || campaign.donorCount === "")
    return undefined;
  const n = Number(campaign.donorCount);
  return Number.isFinite(n) ? n : undefined;
}

function daysRemaining(campaign: RecordData): number | undefined {
  if (
    typeof campaign.daysLeft === "number" &&
    Number.isFinite(campaign.daysLeft)
  )
    return Math.max(0, campaign.daysLeft);
  return undefined;
}

export function donateLabel(accepting: boolean): string {
  return accepting ? "Đóng góp ngay" : "Hiện chưa nhận đóng góp";
}

export function DonateDock({
  campaign,
  onDonate,
}: {
  campaign: RecordData;
  onDonate: () => void;
}) {
  const raised = Number(campaign.currentAmount);
  const target = Number(campaign.targetAmount);
  const progress = getProgress(raised, target);
  const accepting = isAcceptingDonations(campaign);
  return (
    <div className="cd-dock no-print" aria-hidden="true">
      <div>
        <span className="cd-dock-raised num">{formatCurrency(raised)}</span>
        <span className="cd-dock-meta">
          {progress}% · {formatCurrency(target)}
        </span>
      </div>
      <button
        className="button cd-dock-donate"
        tabIndex={-1}
        disabled={!accepting}
        onClick={onDonate}
      >
        {donateLabel(accepting)}
      </button>
    </div>
  );
}

export default function CampaignSummary({
  campaign,
  signedIn,
  owner,
  onDonate,
  onShare,
  onReport,
  onDisburse,
  onRequestClosure,
}: {
  campaign: RecordData;
  signedIn: boolean;
  owner: boolean;
  onDonate: () => void;
  onShare: () => void;
  onReport: () => void;
  onDisburse?: () => void;
  onRequestClosure?: () => void;
}) {
  const raised = Number(campaign.currentAmount);
  const target = Number(campaign.targetAmount);
  const progress = getProgress(raised, target);
  const accepting = isAcceptingDonations(campaign);
  const supporters = confirmedSupporters(campaign);
  const days = daysRemaining(campaign);
  const ended = campaign.isEnded === true || (days === 0 && !accepting);
  const donateRef = useRef<HTMLButtonElement>(null);
  const [dock, setDock] = useState(false);

  useEffect(() => {
    const btn = donateRef.current;
    if (!btn) return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const io = new IntersectionObserver(
      ([entry]) => {
        setDock(mq.matches && !entry.isIntersecting);
      },
      { threshold: 0 },
    );
    const onMq = () => {
      if (!mq.matches) setDock(false);
    };
    io.observe(btn);
    mq.addEventListener("change", onMq);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);

  return (
    <>
      <aside className="cd-summary">
        <div className="cd-summary-head">
          <Status value={campaign.status} />
          {ended && <span className="cd-ended">Đã kết thúc nhận đóng góp</span>}
        </div>

        <p className="cd-raised num">{formatCurrency(raised)}</p>
        <p className="cd-target">trên mục tiêu {formatCurrency(target)}</p>

        <Meter value={progress} label="Tiến độ gây quỹ" />

        <dl className="cd-facts">
          <div>
            <dt>
              <LuFlag aria-hidden="true" />
              Hoàn thành
            </dt>
            <dd className="num">{progress}%</dd>
          </div>
          {supporters !== undefined && (
            <div>
              <dt>
                <LuUsers aria-hidden="true" />
                Người ủng hộ
              </dt>
              <dd className="num">{supporters.toLocaleString("vi-VN")}</dd>
            </div>
          )}
          {days !== undefined && (
            <div>
              <dt>
                <LuCalendarClock aria-hidden="true" />
                {ended ? "Thời hạn" : "Còn lại"}
              </dt>
              <dd>{ended ? "Đã kết thúc" : `${days} ngày`}</dd>
            </div>
          )}
        </dl>

        {campaign.endDate && (
          <p className="cd-deadline">Kết thúc {formatDate(campaign.endDate)}</p>
        )}

        {campaign.rejectionReason && (
          <Notice error>{campaign.rejectionReason}</Notice>
        )}

        <div className="cd-summary-actions">
          <button
            ref={donateRef}
            className="button block cd-donate"
            disabled={!accepting}
            onClick={onDonate}
          >
            {donateLabel(accepting)}
          </button>
          <button className="button secondary block" onClick={onShare}>
            <LuShare2 aria-hidden="true" />
            Sao chép liên kết
          </button>
          {!owner && (
            signedIn ? (
              <button className="button ghost block" onClick={onReport}>
                Báo cáo chiến dịch
              </button>
            ) : (
              <Link to="/login" className="button ghost block text-center" style={{ fontSize: "0.875rem" }}>
                Đăng nhập để báo cáo nội dung
              </Link>
            )
          )}
          {signedIn && owner && ["DRAFT", "PENDING_APPROVAL"].includes(campaign.status) && (
            <Link
              className="button secondary block"
              to={`${campaignPath(campaign)}/edit`}
            >
              Chỉnh sửa chiến dịch
            </Link>
          )}
          {signedIn && owner && onDisburse && (
            <button
              type="button"
              className="button secondary block"
              onClick={onDisburse}
              style={{
                borderColor: "#0d9488",
                color: "#0f766e",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <LuBanknote aria-hidden="true" size={16} />
              Tạo hồ sơ giải ngân
            </button>
          )}
          {signedIn && owner && campaign.status === "ACTIVE" && onRequestClosure && (
            <button
              type="button"
              className="button ghost block"
              onClick={onRequestClosure}
              style={{
                borderColor: campaign.closureRequest?.status === "PENDING" ? "#f59e0b" : "#dc2626",
                color: campaign.closureRequest?.status === "PENDING" ? "#b45309" : "#dc2626",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                backgroundColor: campaign.closureRequest?.status === "PENDING" ? "#fffbeb" : undefined,
              }}
            >
              <LuCalendarClock aria-hidden="true" size={16} />
              {campaign.closureRequest?.status === "PENDING"
                ? "Đang chờ duyệt đóng sớm"
                : "Yêu cầu đóng chiến dịch sớm"}
            </button>
          )}
        </div>

        <div className="cd-organizer">
          <p>Người gây quỹ</p>
          <strong>{campaign.fundraiser?.fullName || "Chưa công bố"}</strong>
          {campaign.organizerType === "ORGANIZATION" &&
            campaign.organizationName && <p>{campaign.organizationName}</p>}
        </div>
      </aside>
      {dock &&
        createPortal(
          <DonateDock campaign={campaign} onDonate={onDonate} />,
          document.body,
        )}
    </>
  );
}
