import { Link } from "react-router-dom";
import {
  LuBadgeCheck,
  LuCircleCheckBig,
  LuClock,
  LuUsers,
} from "react-icons/lu";
import type { Campaign } from "../../types";
import { CATEGORY_LABELS } from "../../types";
import { formatCurrency, getDaysLeft, getProgress } from "../../services/api";
import { campaignPath, safeUrl } from "../../services/platform";
import { categoryIcon } from "./categoryIcon";
import { Badge, Meter } from "./WorkspaceUI";

interface CampaignCardProps {
  campaign: Campaign;
  featured?: boolean;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function CampaignCard({
  campaign,
  featured = false,
}: CampaignCardProps) {
  const progress = getProgress(campaign.raisedAmount, campaign.targetAmount);
  const daysLeft = getDaysLeft(campaign.deadline);
  const isUrgent = daysLeft <= 7 && daysLeft > 0;
  const isCompleted = progress >= 100;
  const CategoryIcon = categoryIcon(campaign.category);
  const category =
    campaign.categoryName ||
    CATEGORY_LABELS[campaign.category as keyof typeof CATEGORY_LABELS] ||
    campaign.category;
  const avatar = safeUrl(campaign.creator.avatar);
  const classes = [
    "campaign-card",
    featured && "featured",
    isCompleted && "complete",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className="campaign-card-media">
        <img
          src={campaign.thumbnail}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/campaign-placeholder.svg";
          }}
        />
        {isCompleted ? (
          <Badge
            tone="success"
            icon={LuCircleCheckBig}
            className="campaign-card-flag"
          >
            Đạt mục tiêu
          </Badge>
        ) : (
          isUrgent && (
            <Badge tone="danger" icon={LuClock} className="campaign-card-flag">
              Sắp kết thúc
            </Badge>
          )
        )}
      </div>

      <div className="campaign-card-body">
        {category && (
          <span className="campaign-card-category">
            <CategoryIcon aria-hidden="true" />
            {category}
          </span>
        )}
        <h3 className="campaign-card-title">
          <Link className="campaign-card-link" to={campaignPath(campaign)}>
            {campaign.title}
          </Link>
        </h3>
        {campaign.shortDesc && (
          <p className="campaign-card-summary">{campaign.shortDesc}</p>
        )}

        <div className="campaign-card-creator">
          <span className="avatar small" aria-hidden="true">
            {avatar ? (
              <img src={avatar} alt="" loading="lazy" />
            ) : (
              initials(campaign.creator.name)
            )}
          </span>
          <span>{campaign.creator.name}</span>
          {campaign.creator.isVerified && (
            <LuBadgeCheck
              className="verified"
              role="img"
              aria-label="Đã xác minh"
            />
          )}
        </div>

        <div className="campaign-card-funding">
          <div className="campaign-card-amounts">
            <span className="campaign-card-raised">
              {formatCurrency(campaign.raisedAmount)}
            </span>
            <span className="campaign-card-percent">{progress}%</span>
          </div>
          <Meter value={progress} />
          <span className="campaign-card-target">
            Mục tiêu {formatCurrency(campaign.targetAmount)}
          </span>
        </div>

        <div className="campaign-card-meta">
          <span>
            <LuUsers aria-hidden="true" />
            {campaign.donorCount.toLocaleString("vi-VN")} người ủng hộ
          </span>
          <span className={isUrgent ? "ending" : undefined}>
            <LuClock aria-hidden="true" />
            {daysLeft === 0 ? "Đã kết thúc" : `Còn ${daysLeft} ngày`}
          </span>
        </div>
      </div>
    </article>
  );
}

export default CampaignCard;
