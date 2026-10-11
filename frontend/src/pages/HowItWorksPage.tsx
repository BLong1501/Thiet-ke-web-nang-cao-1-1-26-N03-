import { Link } from "react-router-dom";
import { Page } from "../components/ui/WorkspaceUI";
export default function HowItWorksPage() {
  return (
    <Page
      title="Sẻ chia một cách minh bạch"
      intro="Từ câu chuyện đến hành động — cùng theo dõi từng bước."
    >
      <div className="steps-grid">
        {[
          [
            "01",
            "Khám phá",
            "Đọc câu chuyện, mục tiêu, thời hạn và thông tin người gây quỹ.",
          ],
          [
            "02",
            "Đóng góp",
            "Chọn số tiền, tạo giao dịch và theo dõi trạng thái xác nhận.",
          ],
          [
            "03",
            "Đồng hành",
            "Theo dõi nhật ký tiến độ và chứng từ sử dụng quỹ trên trang chiến dịch.",
          ],
        ].map(([n, title, body]) => (
          <article className="panel" key={n}>
            <span className="step-number">{n}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <section className="panel narrow">
        <h2>Bạn muốn gây quỹ?</h2>
        <ol className="guide-list">
          <li>Đăng ký tài khoản và xác minh email bằng OTP.</li>
          <li>Nộp hồ sơ KYC và chờ quản trị viên phê duyệt.</li>
          <li>
            Tạo chiến dịch với câu chuyện, mục tiêu, thời gian và thông tin ngân
            hàng.
          </li>
          <li>Gửi xét duyệt; chiến dịch được duyệt sẽ xuất hiện công khai.</li>
          <li>Cập nhật tiến độ và công khai chứng từ giải ngân.</li>
        </ol>
        <Link className="button" to="/profile?tab=kyc">
          Bắt đầu xác minh
        </Link>
      </section>
      <section className="panel narrow">
        <h2>Câu hỏi thường gặp</h2>
        {[
          [
            "Tôi có thể đóng góp ẩn danh?",
            "Có. Chọn ẩn tên khi tạo giao dịch. Tên của bạn sẽ không hiển thị trên danh sách đóng góp công khai.",
          ],
          [
            "Tại sao giao dịch vẫn đang chờ?",
            "Tạo yêu cầu đóng góp chưa phải là xác nhận thanh toán. Trạng thái chỉ thay đổi khi máy chủ xác nhận.",
          ],
          [
            "Làm sao xem lịch sử đóng góp?",
            "Đăng nhập trước khi tạo giao dịch để gắn đóng góp với tài khoản. Sau đó mở Hồ sơ → Lịch sử đóng góp.",
          ],
          [
            "Tôi có thể hoàn tiền không?",
            "Mở giao dịch đã thành công trong lịch sử và gửi lý do. Máy chủ kiểm tra điều kiện chiến dịch bị hủy hoặc hết hạn không đạt mục tiêu. Quy trình hiện tại phục vụ mô phỏng trong đồ án.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </Page>
  );
}
