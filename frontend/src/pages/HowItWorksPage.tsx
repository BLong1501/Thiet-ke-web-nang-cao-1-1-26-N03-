import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'Tiền quyên góp được bảo quản và kiểm soát như thế nào?',
    a: 'Mọi khoản đóng góp của nhà hảo tâm được lưu trữ trực tiếp tại tài khoản ký quỹ chuyên biệt của ngân hàng đối tác bảo lãnh. Người gây quỹ không được rút toàn bộ tiền một lần mà chỉ được giải ngân từng đợt sau khi cung cấp đầy đủ hợp đồng, hóa đơn đỏ và biên bản nghiệm thu hợp lệ.',
  },
  {
    q: 'Làm thế nào để biết chiến dịch không giả mạo?',
    a: '100% người gây quỹ trên FundTrust phải trải qua quy trình xác minh danh tính điện tử KYC 2 cấp độ: đối soát dữ liệu CCCD/VNeID và xác minh thực địa từ đại diện chính quyền cơ sở hoặc tổ chức uy tín tại địa phương.',
  },
  {
    q: 'Nếu chiến dịch không đạt 100% mục tiêu thì tiền sẽ đi về đâu?',
    a: 'Tùy thuộc vào cam kết khi tạo chiến dịch: nếu chiến dịch có tính chất hỗ trợ khẩn cấp (như chi phí phẫu thuật, cứu trợ bão lũ), số tiền đã gây quỹ vẫn sẽ được giải ngân theo đúng tỷ lệ để kịp thời cứu trợ; hoặc quỹ sẽ thực hiện hoàn tiền lại cho nhà hảo tâm nếu dự án không thể triển khai.',
  },
  {
    q: 'Nền tảng FundTrust có thu phí gây quỹ không?',
    a: 'FundTrust duy trì mô hình 0% phí nền tảng cho các chiến dịch y tế và cứu trợ khẩn cấp. Nền tảng chỉ khấu trừ mức phí xử lý giao dịch cổng thanh toán tối thiểu (VietQR 0%, thẻ thanh toán theo quy định ngân hàng).',
  },
];

export const HowItWorksPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Hero Section */}
      <section
        style={{
          padding: '64px 0 48px',
          background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--background) 100%)',
          borderBottom: '1px solid var(--outline-variant)',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: 780 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--primary-fixed)', borderRadius: 20, color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 14 }}>
            <span>⚖️</span> Minh bạch • Trách nhiệm • Tin cậy
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.8rem, 3.8vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--on-surface)',
              marginBottom: 16,
              lineHeight: 1.25,
            }}
          >
            Cách thức hoạt động của <span style={{ color: 'var(--primary-container)' }}>FundTrust</span>
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
            Tiêu chuẩn hóa quy trình gây quỹ cộng đồng bằng công nghệ số và tài khoản ký quỹ giám sát độc lập, đảm bảo từng đồng tiền cứu trợ đến đúng người, đúng việc.
          </p>
        </div>
      </section>

      {/* 4-Step Process Grid */}
      <section style={{ padding: '64px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
              Quy trình 4 bước bảo vệ trọn vẹn giá trị từ thiện
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', margin: 0 }}>
              Từ khâu khởi tạo đến nghiệm thu bàn giao thực tế đều được giám sát công khai.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              {
                step: '01',
                icon: '🆔',
                title: 'Xác minh KYC & Khảo sát',
                desc: 'Người khởi tạo phải định danh CCCD/VNeID và cung cấp hồ sơ bệnh án hoặc giấy phép hoạt động từ thiện được chính quyền xác nhận.',
              },
              {
                step: '02',
                icon: '🔐',
                title: 'Khóa quỹ bảo chứng',
                desc: 'Tiền ủng hộ từ cộng đồng chuyển thẳng vào tài khoản ký quỹ của ngân hàng đối tác, độc lập hoàn toàn với tài khoản cá nhân.',
              },
              {
                step: '03',
                icon: '🧾',
                title: 'Giải ngân theo tiến độ',
                desc: 'Quỹ chỉ giải ngân theo từng đợt dựa trên hợp đồng cung cấp vật tư hoặc chi phí điều trị thực tế được hội đồng kiểm duyệt.',
              },
              {
                step: '04',
                icon: '📊',
                title: 'Sao kê số & Nghiệm thu',
                desc: 'Tự động xuất sổ cái thu chi, hình ảnh nghiệm thu thực địa và hóa đơn đỏ lên trang chiến dịch để bất kỳ ai cũng có thể tra cứu.',
              },
            ].map((st, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '32px 24px',
                  boxShadow: 'var(--shadow-xs)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: '2rem' }}>{st.icon}</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', opacity: 0.6 }}>
                    {st.step}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)', marginBottom: 12 }}>
                  {st.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section style={{ padding: '64px 0', background: 'var(--surface-container-low)', borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}>
        <div className="container" style={{ maxWidth: 940 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
              Sự khác biệt vượt trội của FundTrust
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', margin: 0 }}>
              So sánh giữa mô hình tự kêu gọi truyền thống và nền tảng chuẩn mực số FundTrust
            </p>
          </div>

          <div style={{ background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--on-surface)', width: '35%' }}>Tiêu chí kiểm soát</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--on-surface-variant)', width: '32%' }}>Gây quỹ tài khoản cá nhân</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--primary)', width: '33%', fontWeight: 700 }}>Nền tảng FundTrust</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    k: 'Xác minh danh tính',
                    old: 'Chủ yếu dựa vào niềm tin cảm tính',
                    neu: 'Định danh điện tử CCCD/VNeID + Khảo sát cơ sở',
                  },
                  {
                    k: 'Tài khoản giữ tiền',
                    old: 'Tài khoản cá nhân tự quản lý',
                    neu: 'Tài khoản ký quỹ ngân hàng đối tác bảo chứng',
                  },
                  {
                    k: 'Phương thức thanh toán',
                    old: 'Chuyển khoản thủ công dễ nhầm',
                    neu: 'Tích hợp VietQR tự động sinh mã đối soát 30s',
                  },
                  {
                    k: 'Minh bạch sao kê',
                    old: 'Chụp màn hình app ngân hàng dễ chỉnh sửa',
                    neu: 'Sổ cái thu chi thời gian thực đính kèm hóa đơn đỏ',
                  },
                  {
                    k: 'Cơ chế bảo vệ người ủng hộ',
                    old: 'Không có cơ chế bồi hoàn nếu trục lợi',
                    neu: 'Cam kết hoàn tiền 100% nếu vi phạm cam kết mục đích',
                  },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--on-surface)' }}>{row.k}</td>
                    <td style={{ padding: '16px 20px', color: '#991b1b', background: '#fef2f2' }}>✕ {row.old}</td>
                    <td style={{ padding: '16px 20px', color: '#065f46', background: '#ecfdf5', fontWeight: 600 }}>✓ {row.neu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section style={{ padding: '64px 0' }}>
        <div className="container" style={{ maxWidth: 780 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.02em', margin: '0 0 10px' }}>
              Câu hỏi thường gặp
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', margin: 0 }}>
              Giải đáp thắc mắc về tính pháp lý và quy chế hoạt động của nền tảng
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: 'var(--on-surface)',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: '1.2rem', color: 'var(--primary)', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 20px 18px', color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA Box */}
          <div
            style={{
              marginTop: 56,
              padding: '40px 32px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.5rem', fontWeight: 800 }}>
              Bạn có hoàn cảnh cần sự tương trợ từ cộng đồng?
            </h3>
            <p style={{ margin: '0 auto 24px', maxWidth: 480, fontSize: '0.9375rem', opacity: 0.9 }}>
              Đăng ký khởi tạo chiến dịch ngay hôm nay để được hướng dẫn thủ tục thẩm định và kết nối các tấm lòng hảo tâm.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/campaigns/create" style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  style={{
                    padding: '12px 26px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#fff',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                >
                  Tạo chiến dịch ngay
                </button>
              </Link>
              <Link to="/campaigns" style={{ textDecoration: 'none' }}>
                <button
                  type="button"
                  style={{
                    padding: '12px 22px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(255,255,255,0.4)',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                >
                  Khám phá các chiến dịch
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
