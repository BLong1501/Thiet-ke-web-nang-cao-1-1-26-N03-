import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  LuArrowRight,
  LuClipboardCheck,
  LuHandCoins,
  LuMegaphone,
  LuReceipt,
  LuShieldCheck,
} from "react-icons/lu";
import { campaignApi } from "../services/api";
import { listResult } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import Seo from "../components/Seo";
import {
  RemoteState,
  Empty,
  CampaignGridSkeleton,
} from "../components/ui/WorkspaceUI";
import {
  FeaturedCampaigns,
  HeroSpotlight,
} from "../components/home/HomeCampaigns";
import CategoryIndex from "../components/home/CategoryIndex";
import { toHomeCampaign } from "../components/home/homeData";
import "./home.css";

const TRUST: [title: string, body: string, where: string][] = [
  [
    "Xác minh người gây quỹ",
    "Người gây quỹ hoàn tất xác minh danh tính trước khi bắt đầu một chiến dịch.",
    "Áp dụng cho mọi tài khoản gây quỹ",
  ],
  [
    "Duyệt trước khi công khai",
    "Mỗi chiến dịch đều được xem xét trước khi xuất hiện để cộng đồng tìm hiểu và đóng góp.",
    "Trạng thái hiển thị trên từng chiến dịch",
  ],
  [
    "Theo dõi từng khoản đóng góp",
    "Kiểm tra trạng thái thanh toán, tra cứu giao dịch và lưu biên lai ngay trong tài khoản của bạn.",
    "Lịch sử đóng góp trong bảng điều khiển",
  ],
  [
    "Sao kê giải ngân công khai",
    "Xem từng khoản chi, chứng từ đi kèm và tải sao kê để biết khoản đóng góp được sử dụng ra sao.",
    "Tab “Minh bạch” trên trang chiến dịch",
  ],
  [
    "Báo cáo dấu hiệu bất thường",
    "Người dùng đã đăng nhập có thể gửi báo cáo về một chiến dịch để quản trị viên xem xét.",
    "Nút “Báo cáo chiến dịch” trên trang chi tiết",
  ],
];

const DONOR_STEPS: [string, string][] = [
  [
    "Chọn một chiến dịch",
    "Đọc câu chuyện, mục tiêu, thời hạn và thông tin người gây quỹ.",
  ],
  [
    "Tạo yêu cầu đóng góp",
    "Chọn số tiền, có thể ẩn tên. Bạn nhận mã giao dịch để tra cứu.",
  ],
  [
    "Theo dõi thanh toán",
    "Kiểm tra trạng thái và nhận biên lai sau khi thanh toán được xác nhận.",
  ],
  [
    "Theo dõi việc sử dụng quỹ",
    "Xem cập nhật tiến độ, sao kê giải ngân và in biên lai khi cần.",
  ],
];

const FUNDRAISER_STEPS: [string, string][] = [
  ["Đăng ký tài khoản", "Xác minh email bằng mã OTP gửi về hộp thư."],
  [
    "Nộp hồ sơ định danh",
    "Quản trị viên phê duyệt danh tính trước khi bạn được tạo chiến dịch.",
  ],
  [
    "Tạo chiến dịch và gửi duyệt",
    "Câu chuyện, mục tiêu, thời hạn và tài khoản nhận tiền.",
  ],
  [
    "Cập nhật và công khai giải ngân",
    "Đăng tiến độ, công bố từng khoản chi kèm chứng từ.",
  ],
];

function ProcessTrack({
  title,
  icon: Icon,
  steps,
}: {
  title: string;
  icon: IconType;
  steps: [string, string][];
}) {
  return (
    <div className="home-track">
      <h3>
        <Icon aria-hidden="true" />
        {title}
      </h3>
      <ol>
        {steps.map(([name, body]) => (
          <li key={name}>
            <strong>{name}</strong>
            <span>{body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const role = user?.role?.toUpperCase();
  const fundraise =
    role === "FUNDRAISER" || role === "ADMIN"
      ? { to: "/campaigns/create", label: "Tạo chiến dịch" }
      : isAuthenticated
        ? { to: "/profile?tab=kyc", label: "Đăng ký gây quỹ" }
        : { to: "/campaigns/create", label: "Bắt đầu gây quỹ" };

  const campaigns = useRemote(() =>
    campaignApi.getAll({ limit: 5, sortBy: "newest" }).then(listResult),
  );
  const items = (campaigns.data?.items ?? []).map(toHomeCampaign);
  const [spotlight, ...featured] = items;
  const showFeatured =
    campaigns.loading ||
    Boolean(campaigns.error) ||
    items.length === 0 ||
    featured.length > 0;

  return (
    <>
      <Seo
        title="Gây quỹ cộng đồng minh bạch"
        description="FundTrust công khai chiến dịch đã được duyệt, ghi nhận đóng góp khi máy chủ xác nhận và lưu từng khoản giải ngân kèm chứng từ."
      />

      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-hero container">
          <div className="home-hero-copy">
            <p className="home-kicker">Nền tảng gây quỹ cộng đồng</p>
            <h1 id="home-title" className="home-hero-title">
              Cùng nhau,
              <br />
              <em>giúp đúng nơi.</em>
            </h1>
            <p className="home-hero-lead">
              Tìm chiến dịch bạn muốn đồng hành và theo dõi cách từng khoản đóng
              góp được sử dụng. Một sự sẻ chia, thêm một cơ hội.
            </p>
            <div className="home-hero-actions">
              <Link className="button" to="/campaigns">
                Khám phá chiến dịch
                <LuArrowRight aria-hidden="true" />
              </Link>
              <Link className="button secondary" to={fundraise.to}>
                {fundraise.label}
              </Link>
            </div>
          </div>

          <div className="home-hero-visual">
            {campaigns.loading ? (
              <div
                className="skeleton home-spotlight-skeleton"
                aria-hidden="true"
              />
            ) : spotlight ? (
              <HeroSpotlight item={spotlight} />
            ) : (
              <div className="home-hero-fallback">
                <img src="/logo.png" alt="" width={144} height={144} />
                <p>Chiến dịch được duyệt sẽ xuất hiện tại đây.</p>
              </div>
            )}
          </div>

          <ul className="home-assurances" aria-label="Cơ chế minh bạch">
            <li>
              <LuShieldCheck aria-hidden="true" />
              Người gây quỹ được xác minh danh tính
            </li>
            <li>
              <LuClipboardCheck aria-hidden="true" />
              Chiến dịch được duyệt trước khi công khai
            </li>
            <li>
              <LuReceipt aria-hidden="true" />
              Giải ngân công khai kèm chứng từ
            </li>
          </ul>
        </div>
      </section>

      {showFeatured && (
        <section
          className="home-section container"
          aria-labelledby="home-featured-title"
        >
          <header className="home-section-head">
            <div>
              <p className="home-kicker">Đang gây quỹ</p>
              <h2 id="home-featured-title">Thêm một người, thêm hy vọng.</h2>
            </div>
            <p className="home-section-note">
              Những chiến dịch mới được duyệt. Đọc câu chuyện và chọn nơi bạn
              muốn gửi gắm sự sẻ chia.
            </p>
          </header>
          <RemoteState
            {...campaigns}
            skeleton={<CampaignGridSkeleton count={3} />}
          />
          {campaigns.data &&
            (items.length === 0 ? (
              <Empty title="Chưa có chiến dịch đang gây quỹ">
                Khi chiến dịch đầu tiên được duyệt, bạn sẽ thấy nó tại đây.
              </Empty>
            ) : (
              <FeaturedCampaigns
                items={featured.slice(0, 4)}
                total={campaigns.data.total}
              />
            ))}
        </section>
      )}

      <section
        className="home-section container"
        aria-labelledby="home-explore-title"
      >
        <header className="home-section-head">
          <div>
            <p className="home-kicker">Khám phá</p>
            <h2 id="home-explore-title">Tìm theo điều bạn quan tâm</h2>
          </div>
        </header>
        <CategoryIndex />
      </section>

      <section className="home-trust" aria-labelledby="home-trust-title">
        <div className="container home-trust-inner">
          <div className="home-trust-intro">
            <p className="home-kicker">Minh bạch</p>
            <h2 id="home-trust-title">Sự tin tưởng bắt đầu từ rõ ràng.</h2>
            <p>
              Từ người đứng ra gây quỹ đến từng khoản chi, bạn luôn có nơi để
              tìm hiểu và theo dõi.
            </p>
            <Link className="home-trust-link" to="/how-it-works">
              Xem quy trình chi tiết
              <LuArrowRight aria-hidden="true" />
            </Link>
          </div>
          <ol className="home-trust-list">
            {TRUST.map(([title, body, where], i) => (
              <li key={title}>
                <span className="home-trust-index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <p className="home-trust-where">{where}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="home-section container"
        aria-labelledby="home-process-title"
      >
        <header className="home-section-head">
          <div>
            <p className="home-kicker">Cách hoạt động</p>
            <h2 id="home-process-title">Bắt đầu một điều tốt đẹp.</h2>
          </div>
          <Link className="home-head-link" to="/how-it-works">
            Đọc hướng dẫn đầy đủ
            <LuArrowRight aria-hidden="true" />
          </Link>
        </header>
        <div className="home-process">
          <ProcessTrack
            title="Khi bạn đóng góp"
            icon={LuHandCoins}
            steps={DONOR_STEPS}
          />
          <ProcessTrack
            title="Khi bạn gây quỹ"
            icon={LuMegaphone}
            steps={FUNDRAISER_STEPS}
          />
        </div>
      </section>

      <section className="container" aria-labelledby="home-closing-title">
        <div className="home-closing">
          <div>
            <h2 id="home-closing-title">
              Bắt đầu bằng việc đọc một câu chuyện.
            </h2>
            <p>
              Mỗi chiến dịch đều công khai mục tiêu, tiến độ và người gây quỹ.
              Hãy đóng góp khi bạn đã có đủ thông tin.
            </p>
          </div>
          <div className="home-closing-actions">
            <Link className="button" to="/campaigns">
              Xem tất cả chiến dịch
            </Link>
            {isAuthenticated ? (
              <Link className="button secondary" to={fundraise.to}>
                {fundraise.label}
              </Link>
            ) : (
              <Link className="button secondary" to="/register">
                Tạo tài khoản
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
