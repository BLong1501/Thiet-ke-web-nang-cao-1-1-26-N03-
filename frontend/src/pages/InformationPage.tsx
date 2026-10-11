import { Page } from "../components/ui/WorkspaceUI";
export default function InformationPage({
  privacy = false,
}: {
  privacy?: boolean;
}) {
  return (
    <Page title={privacy ? "Quyền riêng tư" : "Điều khoản sử dụng"}>
      <article className="panel narrow prose">
        {privacy ? (
          <>
            <h2>Thông tin tài khoản</h2>
            <p>
              Họ tên, email và thông tin hồ sơ được sử dụng để quản lý tài khoản
              và liên kết các hoạt động gây quỹ. Phiên đăng nhập được lưu trong
              phiên trình duyệt trên thiết bị của bạn.
            </p>
            <h2>Tài liệu xác minh</h2>
            <p>
              Ảnh KYC được gửi đến máy chủ dưới dạng tệp riêng tư. Chỉ chủ sở
              hữu và quản trị viên được phép truy cập.
            </p>
            <h2>Đóng góp ẩn danh</h2>
            <p>
              Tùy chọn ẩn danh ẩn tên trên danh sách công khai. Quản trị viên
              vẫn có thể truy cập thông tin giao dịch để quản lý và đối soát.
            </p>
            <h2>Thiết bị dùng chung</h2>
            <p>
              Đăng xuất khi sử dụng xong và không chia sẻ mật khẩu hoặc mã OTP
              cho người khác.
            </p>
          </>
        ) : (
          <>
            <h2>Phạm vi phiên bản</h2>
            <p>
              FundTrust hiện là dự án học tập về gây quỹ cộng đồng. Luồng thanh
              toán và hoàn tiền hiện có chức năng mô phỏng để kiểm thử, không
              phải dịch vụ thanh toán thương mại.
            </p>
            <h2>Thông tin chiến dịch</h2>
            <p>
              Người gây quỹ cần cung cấp thông tin chính xác, gửi hồ sơ xác minh
              và chờ phê duyệt trước khi công khai chiến dịch. Nội dung, thời
              hạn và mục tiêu phải được trình bày rõ ràng.
            </p>
            <h2>Minh bạch</h2>
            <p>
              Người gây quỹ có trách nhiệm cập nhật tiến độ và công khai chứng
              từ sử dụng tiền. Nội dung vi phạm có thể bị từ chối hoặc chiến
              dịch bị hủy theo quy trình quản trị.
            </p>
            <h2>Sử dụng tài khoản</h2>
            <p>
              Không mạo danh, chia sẻ thông tin sai lệch hoặc sử dụng giấy tờ
              của người khác. Giữ an toàn cho tài khoản và chỉ gửi tài liệu cần
              thiết để xác minh.
            </p>
          </>
        )}
      </article>
    </Page>
  );
}
