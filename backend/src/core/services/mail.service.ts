import nodemailer, { Transporter } from "nodemailer";

export class MailService {
  private transporter: Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  /**
   * Gửi mã OTP xác thực email khi đăng ký tài khoản mới
   */
  async sendVerificationEmail(email: string, fullName: string, otp: string): Promise<boolean> {
    const subject = "Xác thực tài khoản Crowdfunding Platform";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Xác thực tài khoản</h1>
        </div>
        <div style="padding: 24px;">
          <p>Xin chào <strong>${fullName}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại nền tảng Gây quỹ Cộng đồng (Crowdfunding Platform). Mã xác thực OTP của bạn là:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background: #f0f4ff; padding: 12px 24px; border-radius: 6px; border: 1px dashed #2563eb;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Mã xác thực có hiệu lực trong vòng <strong>10 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        </div>
      </div>
    `;

    return this.sendMail(email, subject, htmlContent, otp, "XÁC THỰC TÀI KHOẢN MỚI");
  }

  /**
   * Gửi mã OTP đặt lại mật khẩu khi quên mật khẩu
   */
  async sendPasswordResetEmail(email: string, fullName: string, otp: string): Promise<boolean> {
    const subject = "Yêu cầu đặt lại mật khẩu - Crowdfunding Platform";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc2626; color: #fff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Đặt lại mật khẩu</h1>
        </div>
        <div style="padding: 24px;">
          <p>Xin chào <strong>${fullName}</strong>,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mã OTP xác nhận là:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #dc2626; background: #fef2f2; padding: 12px 24px; border-radius: 6px; border: 1px dashed #dc2626;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Mã OTP có hiệu lực trong vòng <strong>10 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      </div>
    `;

    return this.sendMail(email, subject, htmlContent, otp, "ĐẶT LẠI MẬT KHẨU");
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    otp: string,
    purpose: string
  ): Promise<boolean> {
    // In trực tiếp ra console trong môi trường Dev để test nhanh
    console.log(`\n======================================================`);
    console.log(`📧 [MOCK EMAIL SERVICE - ${purpose}]`);
    console.log(`👉 Người nhận: ${to}`);
    console.log(`🔑 MÃ OTP: >>> ${otp} <<< (Hạn 10 phút)`);
    console.log(`======================================================\n`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Crowdfunding Platform" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        });
        return true;
      } catch (error) {
        console.error("Gửi email thực tế qua SMTP thất bại:", error);
        return false;
      }
    }

    return true;
  }
}

export const mailService = new MailService();
