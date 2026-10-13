import { Helmet } from "react-helmet-async";
import { safeUrl } from "../services/platform";

export const SITE_NAME = "FundTrust";
const DEFAULT_DESCRIPTION =
  "FundTrust — Kết nối lòng tốt. Khám phá chiến dịch, đóng góp và theo dõi việc sử dụng quỹ minh bạch.";

interface SeoProps {
  /** Tiêu đề trang (không gồm tên site). */
  title: string;
  description?: string;
  /** Ảnh chia sẻ (Open Graph). Chỉ chấp nhận http(s); đường dẫn tương đối được đổi thành tuyệt đối. */
  image?: string;
  /** Trang riêng tư (cần đăng nhập) không nên được công cụ tìm kiếm lập chỉ mục. */
  noindex?: boolean;
  type?: "website" | "article";
  /** Đường dẫn chuẩn khi một nội dung có nhiều URL (vd. chiến dịch theo id và theo slug). */
  canonicalPath?: string;
}

/** Rút gọn mô tả về ~160 ký tự (độ dài hiển thị tối ưu của kết quả tìm kiếm). */
const clip = (text: string, max = 160) => {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/** Chặn lập chỉ mục cho cả một nhánh route riêng tư mà không cần sửa từng trang. */
export function NoIndex() {
  return (
    <Helmet>
      <meta name="robots" content="noindex,nofollow" />
    </Helmet>
  );
}

export default function Seo({
  title,
  description,
  image,
  noindex = false,
  type = "website",
  canonicalPath,
}: SeoProps) {
  const fullTitle = `${title} — ${SITE_NAME}`;
  const desc = clip(description || DEFAULT_DESCRIPTION);
  const url =
    window.location.origin + (canonicalPath || window.location.pathname);
  const img = image ? safeUrl(image) : "";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      {img && <meta property="og:image" content={img} />}
      <meta
        name="twitter:card"
        content={img ? "summary_large_image" : "summary"}
      />
    </Helmet>
  );
}
