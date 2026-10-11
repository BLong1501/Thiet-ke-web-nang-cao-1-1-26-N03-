import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand" to="/">
            FundTrust
          </Link>
          <p>
            Kết nối lòng tốt.
            <br />
            Cùng nhau tạo thay đổi.
          </p>
        </div>
        <nav aria-label="Thông tin">
          <Link to="/how-it-works">Cách hoạt động</Link>
          <Link to="/campaigns">Chiến dịch</Link>
          <Link to="/terms">Điều khoản sử dụng</Link>
          <Link to="/privacy">Quyền riêng tư</Link>
        </nav>
        <p>
          Dự án gây quỹ cộng đồng
          <br />
          Minh bạch trong từng đóng góp.
        </p>
      </div>
    </footer>
  );
}
