import { Link } from "react-router-dom";
import { campaignApi } from "../services/api";
import { listResult, normalizeCampaign } from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import CampaignCard from "../components/ui/CampaignCard";
import { RemoteState, Empty } from "../components/ui/WorkspaceUI";
import { useEffect } from "react";
export default function HomePage() {
  const campaigns = useRemote(() =>
    campaignApi.getAll({ limit: 6, sortBy: "newest" }).then(listResult),
  );
  useEffect(() => {
    document.title = "FundTrust — Kết nối lòng tốt";
  }, []);
  return (
    <>
      <section className="home-hero container">
        <div>
          <p className="eyebrow">KẾT NỐI LÒNG TỐT • LAN TỎA HY VỌNG</p>
          <h1>
            Điều nhỏ bé bạn làm.
            <br />
            <em>Thay đổi lớn lao</em>
            <br />
            cho cộng đồng.
          </h1>
          <p>
            Mỗi câu chuyện xứng đáng được lắng nghe. Cùng những người gây quỹ
            biến sự sẻ chia thành những hành động thiết thực.
          </p>
          <div className="actions">
            <Link className="button" to="/campaigns">
              Khám phá chiến dịch →
            </Link>
            <Link className="button secondary" to="/campaigns/create">
              Bắt đầu gây quỹ
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/campaign-placeholder.svg"
            alt="FundTrust kết nối những tấm lòng"
          />
          <div>
            <strong>Lòng tốt bắt đầu từ sự tin tưởng.</strong>
            <p>
              Theo dõi tiến độ, cập nhật và chứng từ ngay trên từng chiến dịch.
            </p>
          </div>
        </div>
      </section>
      <section className="container home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CÙNG NHAU HÀNH ĐỘNG</p>
            <h2>Những chiến dịch mới</h2>
          </div>
          <Link to="/campaigns">Xem tất cả →</Link>
        </div>
        <RemoteState {...campaigns} />
        {campaigns.data &&
          (campaigns.data.items.length ? (
            <div className="campaign-grid">
              {campaigns.data.items.map((c) => (
                <CampaignCard key={c.id} campaign={normalizeCampaign(c)} />
              ))}
            </div>
          ) : (
            <Empty>
              Chưa có chiến dịch công khai. Hãy quay lại sau hoặc bắt đầu chiến
              dịch của bạn.
            </Empty>
          ))}
      </section>
      <section className="container home-section">
        <div className="steps-grid">
          {[
            [
              "01",
              "Tìm điều bạn quan tâm",
              "Khám phá các câu chuyện và đọc thông tin chiến dịch.",
            ],
            [
              "02",
              "Gửi một phần sẻ chia",
              "Chọn số tiền và làm theo hướng dẫn của giao dịch.",
            ],
            [
              "03",
              "Theo dõi sự thay đổi",
              "Xem lịch sử đóng góp, cập nhật tiến độ và chứng từ.",
            ],
          ].map(([n, title, text]) => (
            <article key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
