import dotenv from "dotenv";
dotenv.config();

import nodemailer, { Transporter } from "nodemailer";

export class MailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
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
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }
  }

  private getTransporter(): Transporter | null {
    if (!this.transporter) {
      this.initTransporter();
    }
    return this.transporter;
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

  /**
   * Gửi thư cảm ơn & Báo cáo biên nhận đóng góp thành công cho người từ thiện
   */
  async sendDonationReceiptEmail(params: {
    to: string;
    donorName: string;
    campaignTitle: string;
    amount: number;
    transactionCode: string;
    paidAt: Date;
    message?: string;
    donationId: string;
  }): Promise<boolean> {
    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(params.amount);

    const formattedDate = new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(params.paidAt);

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const receiptUrl = `${clientUrl}/donations/${params.donationId}`;

    const subject = `[Biên nhận đóng góp] Cảm ơn bạn đã ủng hộ chiến dịch "${params.campaignTitle}"`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Biên Nhận Đóng Góp Thành Công</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">Nền tảng Gây quỹ Cộng đồng (Crowdfunding Platform)</p>
        </div>
        <div style="padding: 24px 28px;">
          <p style="font-size: 16px;">Xin chào <strong>${params.donorName}</strong>,</p>
          <p style="color: #475569;">
            Chúng tôi xin gửi lời cảm ơn chân thành và sâu sắc nhất tới bạn. Khoản đóng góp của bạn đã được hệ thống ghi nhận thành công và chuyển vào quỹ của chiến dịch:
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 18px 0; border-radius: 0 8px 8px 0;">
            <strong style="color: #1e293b; font-size: 16px;">${params.campaignTitle}</strong>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Mã giao dịch:</td>
              <td style="padding: 10px 0; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">${params.transactionCode}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Số tiền ủng hộ:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 16px;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Thời gian ghi nhận:</td>
              <td style="padding: 10px 0; text-align: right; color: #0f172a;">${formattedDate}</td>
            </tr>
            ${
              params.message
                ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Lời nhắn:</td>
              <td style="padding: 10px 0; text-align: right; color: #0f172a; font-style: italic;">"${params.message}"</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Trạng thái:</td>
              <td style="padding: 10px 0; text-align: right; color: #16a34a; font-weight: 700;">ĐÃ HOÀN TẤT</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 30px 0 20px;">
            <a href="${receiptUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Tra Cứu Chi Tiết Đơn Đóng Góp
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Đây là email tự động từ hệ thống. Mọi thắc mắc xin vui lòng liên hệ bộ phận hỗ trợ cộng đồng.
          </p>
        </div>
      </div>
    `;

    console.log(`\n======================================================`);
    console.log(`📧 [GỬI BIÊN NHẬN ĐÓNG GÓP TỚI NHÀ HẢO TÂM]`);
    console.log(`👉 Người nhận: ${params.to} (${params.donorName})`);
    console.log(`💰 Số tiền: ${formattedAmount} - Mã GD: ${params.transactionCode}`);
    console.log(`======================================================\n`);

    // 1. Gửi qua Brevo REST API (HTTPS Port 443 - không bao giờ bị Render chặn)
    if (process.env.BREVO_API_KEY) {
      try {
        const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || "tranbaolong5b@gmail.com").trim();
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": process.env.BREVO_API_KEY.trim(),
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: "Crowdfunding Platform", email: senderEmail },
            to: [{ email: params.to.trim(), name: params.donorName }],
            subject,
            htmlContent,
          }),
        });
        if (res.ok) {
          console.log(`✅ [BREVO API] Đã gửi biên nhận thành công tới: ${params.to}\n`);
          return true;
        }
      } catch (err) {
        console.warn("⚠️ [BREVO API] Gửi biên nhận qua Brevo lỗi:", err);
      }
    }

    // 2. Nếu có cấu hình Resend API (HTTP Port 443)
    if (process.env.RESEND_API_KEY) {
      try {
        const fromAddress = (process.env.RESEND_FROM || "onboarding@resend.dev").trim();
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Crowdfunding <${fromAddress}>`,
            to: [params.to.trim()],
            subject,
            html: htmlContent,
          }),
        });
        if (res.ok) {
          console.log(`✅ [RESEND API] Đã gửi biên nhận đóng góp thành công tới: ${params.to}\n`);
          return true;
        }
      } catch (err) {
        console.warn("⚠️ [RESEND API] Gửi biên nhận qua Resend lỗi:", err);
      }
    }

    // 3. Fallback SMTP (Gmail) với timeout 10s
    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const fromAddress = (process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
        const sendPromise = transporter.sendMail({
          from: `"Crowdfunding Platform" <${fromAddress}>`,
          to: params.to.trim(),
          subject,
          html: htmlContent,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP_CONNECTION_TIMEOUT")), 10000)
        );
        const info = (await Promise.race([sendPromise, timeoutPromise])) as any;
        console.log(`✅ [GMAIL SMTP] Đã gửi biên nhận đóng góp thành công tới: ${params.to} (MessageId: ${info?.messageId})\n`);
        return true;
      } catch (error) {
        console.warn("⚠️ Gửi email biên nhận đóng góp qua SMTP thất bại hoặc timeout (Render Free Tier chặn port SMTP):", error);
        return false;
      }
    }
    return true;
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    otp: string,
    purpose: string
  ): Promise<boolean> {
    // In trực tiếp ra console để kiểm tra tức thì trong Render Dashboard Logs
    console.log(`\n======================================================`);
    console.log(`📧 [MÃ XÁC THỰC EMAIL - ${purpose}]`);
    console.log(`👉 Người nhận: ${to}`);
    console.log(`🔑 MÃ OTP: >>> ${otp} <<< (Hạn 10 phút)`);
    console.log(`======================================================\n`);

    // 1. Thử gửi qua Brevo REST API (HTTPS Port 443 - Miễn phí 300 mail/ngày, gửi được tới mọi hòm thư)
    if (process.env.BREVO_API_KEY) {
      try {
        const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || "tranbaolong5b@gmail.com").trim();
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": process.env.BREVO_API_KEY.trim(),
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: "Crowdfunding Platform", email: senderEmail },
            to: [{ email: to.trim() }],
            subject,
            htmlContent: html,
          }),
        });
        if (res.ok) {
          console.log(`✅ [BREVO REST API] Đã gửi mã OTP thực tế thành công tới: ${to}\n`);
          return true;
        } else {
          const errData = await res.text();
          console.warn(`⚠️ [BREVO API] Phản hồi lỗi:`, errData);
        }
      } catch (err) {
        console.warn(`⚠️ [BREVO API] Lỗi kết nối Brevo:`, err);
      }
    }

    // 2. Thử gửi qua Resend API nếu có cấu hình (HTTPS Port 443)
    if (process.env.RESEND_API_KEY) {
      try {
        const fromAddress = (process.env.RESEND_FROM || "onboarding@resend.dev").trim();
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Crowdfunding <${fromAddress}>`,
            to: [to.trim()],
            subject,
            html,
          }),
        });
        if (res.ok) {
          console.log(`✅ [RESEND API] Đã gửi mã OTP thực tế thành công tới: ${to}\n`);
          return true;
        } else {
          const errData = await res.text();
          console.warn(`⚠️ [RESEND API] Phản hồi lỗi:`, errData);
        }
      } catch (err) {
        console.warn(`⚠️ [RESEND API] Lỗi kết nối Resend:`, err);
      }
    }

    // 3. Thử gửi qua Custom Webhook Relay (Google Apps Script / HTTP Relay qua Port 443)
    if (process.env.MAIL_WEBHOOK_URL) {
      try {
        const res = await fetch(process.env.MAIL_WEBHOOK_URL.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: to.trim(), subject, html, otp }),
        });
        if (res.ok) {
          console.log(`✅ [WEBHOOK RELAY] Đã gửi mã OTP thực tế thành công tới: ${to}\n`);
          return true;
        }
      } catch (err) {
        console.warn("⚠️ [WEBHOOK RELAY] Gửi mail qua Webhook lỗi:", err);
      }
    }

    // 4. Thử gửi qua SMTP (Gmail) với timeout 10 giây
    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const fromAddress = (process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
        const sendPromise = transporter.sendMail({
          from: `"Crowdfunding Platform" <${fromAddress}>`,
          to: to.trim(),
          subject,
          html,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP_CONNECTION_TIMEOUT")), 10000)
        );
        const info = (await Promise.race([sendPromise, timeoutPromise])) as any;
        console.log(`✅ [GMAIL SMTP] Đã gửi email thực tế thành công tới: ${to} (MessageId: ${info?.messageId})\n`);
        return true;
      } catch (error: any) {
        console.warn(`⚠️ [GMAIL SMTP BỊ CHẶN] Không gửi được qua cổng 587/465 (${error?.message || error}).`);
        console.warn(`💡 Lưu ý: Render Free Tier chặn kết nối gửi thư SMTP ra ngoài (port 25, 465, 587).`);
        console.warn(`🔑 MÃ OTP CỦA ${to} LÀ: >>> ${otp} <<< (Xem trực tiếp tại Render Logs)`);
        return false;
      }
    }

    return true;
  }
}

export const mailService = new MailService();
