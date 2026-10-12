import { Link } from "react-router-dom";
import {
  LuArrowRight,
  LuCircleCheckBig,
  LuClock,
  LuUsers,
} from "react-icons/lu";
import { formatCurrency } from "../../services/api";
import { campaignPath } from "../../services/platform";
import { Badge, Meter } from "../ui/WorkspaceUI";
import { categoryIcon } from "../ui/categoryIcon";
import { daysLabel, imageSources, type HomeCampaign } from "./homeData";

const PLACEHOLDER = "/campaign-placeholder.svg";
/** React 18 chưa nhận prop `fetchPriority`; truyền thẳng thuộc tính HTML viết thường. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

export function PhaseBadge({ item }: { item: HomeCampaign }) {
  switch (item.phase) {
    case "funded":
      return (
        <Badge tone="success" icon={LuCircleCheckBig}>
          Đạt mục tiêu
        </Badge>
      );
    case "ending":
      return (
        <Badge tone="danger" icon={LuClock}>
          {daysLabel(item)}
        </Badge>
      );
    case "ended":
      return <Badge>Đã kết thúc</Badge>;
    default:
      return <Badge tone="info">Đang gây quỹ</Badge>;
  }
}

function CampaignImage({
  src,
  alt,
  widths,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  widths: number[];
  sizes: string;
  priority?: boolean;
}) {
  const sources = imageSources(src, widths);
  return (
    <img
      {...sources}
      sizes={sources.srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      {...(priority ? HIGH_PRIORITY : null)}
      decoding="async"
      onError={(e) => {
        const img = e.currentTarget;
        img.onerror = null;
        img.removeAttribute("srcset");
        img.src = PLACEHOLDER;
      }}
    />
  );
}

function CategoryLabel({ item }: { item: HomeCampaign }) {
  const { campaign } = item;
  const name = campaign.categoryName || campaign.category;
  if (!name || name === "khac") return null;
  const Icon = categoryIcon(campaign.category);
  return (
    <span className="home-category-label">
      <Icon aria-hidden="true" />
      {name}
    </span>
  );
}

function Funding({ item, size }: { item: HomeCampaign; size: "lg" | "sm" }) {
  const { campaign, progress } = item;
  return (
    <div className={`home-funding ${size}`}>
      <p className="home-funding-amounts">
        <strong>{formatCurrency(campaign.raisedAmount)}</strong>
        <span>
          {size === "lg" ? "đã nhận trên mục tiêu " : "/ "}
          {formatCurrency(campaign.targetAmount)}
        </span>
      </p>
      <Meter value={progress} />
      <p className="home-funding-meta">
        <span className="home-funding-percent">{progress}% mục tiêu</span>
        {item.supporters !== undefined && (
          <span>
            <LuUsers aria-hidden="true" />
            {item.supporters.toLocaleString("vi-VN")} người ủng hộ
          </span>
        )}
        {item.phase !== "ending" && (
          <span>
            <LuClock aria-hidden="true" />
            {daysLabel(item)}
          </span>
        )}
      </p>
    </div>
  );
}

/** Ảnh chiến dịch mới nhất kèm "phiếu" tiến độ thật, đặt lệch khung ảnh. */
export function HeroSpotlight({ item }: { item: HomeCampaign }) {
  const { campaign } = item;
  return (
    <figure className="home-spotlight">
      <div className="home-spotlight-media">
        <CampaignImage
          src={campaign.thumbnail}
          alt={`Hình ảnh chiến dịch “${campaign.title}”`}
          widths={[640, 960, 1280]}
          sizes="(max-width: 768px) 100vw, 40vw"
          priority
        />
      </div>
      <figcaption className="home-slip">
        <p className="home-slip-eyebrow">Chiến dịch mới đăng</p>
        <div className="home-slip-top">
          <CategoryLabel item={item} />
          <PhaseBadge item={item} />
        </div>
        <h2 className="home-slip-title">
          <Link className="home-stretched" to={campaignPath(campaign)}>
            {campaign.title}
          </Link>
        </h2>
        <Funding item={item} size="sm" />
      </figcaption>
    </figure>
  );
}

function LeadCampaign({ item, solo }: { item: HomeCampaign; solo: boolean }) {
  const { campaign } = item;
  return (
    <article className={solo ? "home-lead solo" : "home-lead"}>
      <div className="home-lead-media">
        <CampaignImage
          src={campaign.thumbnail}
          alt=""
          widths={[640, 960, 1280]}
          sizes="(max-width: 768px) 100vw, 56vw"
        />
      </div>
      <div className="home-lead-body">
        <div className="home-slip-top">
          <CategoryLabel item={item} />
          <PhaseBadge item={item} />
        </div>
        <h3 className="home-lead-title">
          <Link className="home-stretched" to={campaignPath(campaign)}>
            {campaign.title}
          </Link>
        </h3>
        {campaign.shortDesc && (
          <p className="home-lead-summary">{campaign.shortDesc}</p>
        )}
        {campaign.creator.name && (
          <p className="home-lead-creator">
            Người gây quỹ: <strong>{campaign.creator.name}</strong>
          </p>
        )}
        <Funding item={item} size="lg" />
        <span className="button secondary home-lead-cta" aria-hidden="true">
          Xem chi tiết chiến dịch
          <LuArrowRight />
        </span>
      </div>
    </article>
  );
}

function CampaignRow({ item }: { item: HomeCampaign }) {
  const { campaign } = item;
  return (
    <article className="home-row">
      <div className="home-row-media">
        <CampaignImage
          src={campaign.thumbnail}
          alt=""
          widths={[240, 400]}
          sizes="(max-width: 640px) 96px, 160px"
        />
      </div>
      <div className="home-row-body">
        <div className="home-slip-top">
          <CategoryLabel item={item} />
          <PhaseBadge item={item} />
        </div>
        <h3 className="home-row-title">
          <Link className="home-stretched" to={campaignPath(campaign)}>
            {campaign.title}
          </Link>
        </h3>
        <Funding item={item} size="sm" />
      </div>
    </article>
  );
}

/** Chiến dịch chính + danh sách phụ. Chiến dịch đã đặt ở hero không lặp lại ở đây. */
export function FeaturedCampaigns({
  items,
  total,
}: {
  items: HomeCampaign[];
  total: number;
}) {
  const [lead, ...rest] = items;
  if (!lead) return null;
  /** Ít hơn 2 chiến dịch phụ: trải chiến dịch chính ngang để tiêu đề không bị ảnh che. */
  const wide = rest.length < 2;
  return (
    <div className={wide ? "home-featured wide" : "home-featured"}>
      <LeadCampaign item={lead} solo={wide} />
      {rest.length > 0 && (
        <div className="home-rows">
          <ul>
            {rest.map((item) => (
              <li key={item.campaign.id}>
                <CampaignRow item={item} />
              </li>
            ))}
          </ul>
          <Link className="home-more" to="/campaigns">
            Xem tất cả {total.toLocaleString("vi-VN")} chiến dịch đang gây quỹ
            <LuArrowRight aria-hidden="true" />
          </Link>
        </div>
      )}
      {rest.length === 0 && (
        <Link className="home-more" to="/campaigns">
          Xem tất cả {total.toLocaleString("vi-VN")} chiến dịch đang gây quỹ
          <LuArrowRight aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
