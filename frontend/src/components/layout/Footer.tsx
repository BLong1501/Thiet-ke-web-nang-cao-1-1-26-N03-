import { Link } from "react-router-dom";

const COLUMNS: [title: string, links: [to: string, label: string][]][] = [
  [
    "Khám phá",
    [
      ["/campaigns", "Chiến dịch"],
      ["/how-it-works", "Cách hoạt động"],
      ["/community", "Cộng đồng"],
    ],
  ],
  [
    "Gây quỹ",
    [
      ["/profile?tab=kyc", "Đăng ký gây quỹ"],
      ["/campaigns/create", "Tạo chiến dịch"],
    ],
  ],
  [
    "Thông tin",
    [
      ["/terms", "Điều khoản sử dụng"],
      ["/privacy", "Quyền riêng tư"],
    ],
  ],
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="brand" to="/">
            <img
              className="brand-mark"
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              loading="lazy"
            />
            FundTrust
          </Link>
          <p>
            Cùng nhau, giúp đúng nơi. Kết nối những tấm lòng với các chiến dịch
            được duyệt, theo dõi đóng góp và công khai từng khoản chi.
          </p>
        </div>
        {COLUMNS.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="footer-title">{title}</p>
            {links.map(([to, label]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} FundTrust</p>
        <p>Nhóm 9 · CSE702051 · Dữ liệu mô phỏng phục vụ mục đích học tập.</p>
      </div>
    </footer>
  );
}
