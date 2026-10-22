import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Campaign } from "../../types";
import { donationApi, formatCurrency } from "../../services/api";
import {
  errorMessage,
  payload,
  type RecordData,
} from "../../services/platform";
import { useAuthStore } from "../../store/authStore";
import { Field, Modal, Notice, Status } from "./WorkspaceUI";
import toast from "react-hot-toast";
import {
  RiBankCardLine,
  RiWallet3Line,
  RiCheckDoubleLine,
  RiLightbulbLine,
  RiTimeLine,
  RiLockLine,
  RiRefreshLine,
} from "react-icons/ri";
import {
  FiCopy,
  FiCheck,
  FiZap,
  FiExternalLink,
  FiLoader,
  FiSmartphone,
} from "react-icons/fi";
import { HiBolt } from "react-icons/hi2";
import {
  buildVietQrUrl,
  buildFallbackQrUrl,
} from "../../utils/bankHelper";

function CopyBtn({
  copied,
  disabled,
  onClick,
  tone = "secondary",
}: {
  copied: boolean;
  disabled?: boolean;
  onClick: () => void;
  tone?: "secondary" | "primary" | "momo";
}) {
  return (
    <button
      type="button"
      className={`dm-copy button ${tone === "secondary" ? "secondary" : ""} ${tone === "momo" ? "dm-copy--momo" : ""} ${tone === "primary" ? "dm-copy--warn" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {copied ? <FiCheck size={14} aria-hidden="true" /> : <FiCopy size={13} aria-hidden="true" />}
      <span>{copied ? "Đã chép" : "Copy"}</span>
    </button>
  );
}

export default function DonationModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState(100000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [donation, setDonation] = useState<RecordData | null>(null);
  const [instructions, setInstructions] = useState<RecordData | null>(null);
  const [activeTab, setActiveTab] = useState<"VIETQR" | "MOMO">("VIETQR");
  const [simulating, setSimulating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrHasError, setQrHasError] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const request = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!donation) return;
    if (donation.paymentStatus !== "PENDING") return;

    const calcRemaining = () => {
      const createdTime = donation.createdAt
        ? new Date(donation.createdAt).getTime()
        : Date.now();
      const expiresTime = createdTime + 10 * 60 * 1000;
      return Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));
    };

    const initial = calcRemaining();
    setTimeLeft(initial);
    if (initial <= 0) {
      setDonation((prev) =>
        prev ? { ...prev, paymentStatus: "FAILED" } : null,
      );
      return;
    }

    const timer = setInterval(() => {
      const remaining = calcRemaining();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        setDonation((prev) =>
          prev ? { ...prev, paymentStatus: "FAILED" } : null,
        );
        toast.error(
          "Giao dịch đã quá hạn 10 phút và bị khóa! Mã QR đã hết hiệu lực.",
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [donation?.id, donation?.createdAt, donation?.paymentStatus]);

  const isExpired =
    donation?.paymentStatus === "FAILED" ||
    (donation?.paymentStatus === "PENDING" && timeLeft <= 0);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setQrLoaded(false);
    setQrHasError(false);
    setTimeLeft(600);
    const f = new FormData(e.currentTarget);
    const idCard = String(f.get("idCard") || "").trim();
    if (!user && !idCard) {
      setError("Khách vãng lai bắt buộc phải nhập số CCCD (12 chữ số) để lưu trữ hồ sơ đối soát và quyền hoàn tiền sau này.");
      setBusy(false);
      return;
    }
    if (!user && !/^[0-9]{12}$/.test(idCard)) {
      setError("Số Căn cước công dân phải bao gồm đúng 12 chữ số.");
      setBusy(false);
      return;
    }
    const body = {
      campaignId: campaign.id,
      amount,
      donorName: String(f.get("name") || "").trim() || undefined,
      donorEmail: String(f.get("email") || "").trim() || undefined,
      donorIdCard: idCard || undefined,
      message: String(f.get("message") || "").trim(),
      isAnonymous: f.get("anonymous") === "on",
      paymentMethod: "BANK_TRANSFER",
    };
    const signature = JSON.stringify(body);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const r = await donationApi.create({
        ...body,
        requestKey: request.current.key,
      });
      const data = payload(r);
      const actualDonation = data?.donation || data;
      const actualInstructions = data?.paymentInstructions || null;
      setDonation(actualDonation);
      setInstructions(actualInstructions);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!donation || donation.paymentStatus !== "PENDING" || isExpired) return;
    const interval = setInterval(async () => {
      try {
        const res = await donationApi.getStatus(donation.id);
        const data = payload(res);
        if (data && data.paymentStatus === "SUCCESS") {
          setDonation((prev) => ({
            ...prev,
            ...data,
            paymentStatus: "SUCCESS",
          }));
          onSuccess?.(Number(data.amount));
          toast.success(
            "Thanh toán thành công! Hệ thống đã ghi nhận khoản đóng góp.",
          );
        } else if (data && data.paymentStatus === "FAILED") {
          setDonation((prev) => ({
            ...prev,
            ...data,
            paymentStatus: "FAILED",
          }));
        }
      } catch {
        // bỏ qua lỗi gián đoạn mạng khi polling
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [donation?.id, donation?.paymentStatus, isExpired, onSuccess]);

  function copyText(text: string, label: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => {
      setCopiedKey((cur) => (cur === key ? null : cur));
    }, 2000);
  }

  async function handleSimulate() {
    if (!donation || simulating) return;
    setSimulating(true);
    try {
      const res = await donationApi.simulateSuccess(donation.id);
      const data = payload(res);
      setDonation((prev) => ({ ...prev, ...data, paymentStatus: "SUCCESS" }));
      onSuccess?.(Number(donation.amount));
      toast.success("Mô phỏng thanh toán thành công!");
    } catch (err) {
      toast.error(errorMessage(err) || "Không thể mô phỏng xác nhận");
    } finally {
      setSimulating(false);
    }
  }

  const bank =
    instructions?.bankTransfer?.bankName || campaign.bankName || "Vietcombank";
  const accNumber =
    instructions?.bankTransfer?.accountNumber ||
    campaign.bankAccountNumber ||
    "123456789";
  const accName =
    instructions?.bankTransfer?.accountName ||
    campaign.bankAccountName ||
    "CHỦ CHIẾN DỊCH";
  const transferCode = donation?.transactionCode || "";
  const transferAmount = Number(donation?.amount || amount);

  const vietQrUrl =
    instructions?.bankTransfer?.qrCodeUrl ||
    buildVietQrUrl({
      bankName: bank,
      accountNumber: accNumber,
      accountName: accName,
      amount: transferAmount,
      transactionCode: transferCode,
    });

  const fallbackQrUrl = buildFallbackQrUrl({
    bankName: bank,
    accountNumber: accNumber,
    accountName: accName,
    amount: transferAmount,
    transactionCode: transferCode,
  });

  let legalMeta: RecordData | null = null;
  if (campaign.beneficiaryInfo) {
    try {
      legalMeta = JSON.parse(campaign.beneficiaryInfo);
    } catch {
      legalMeta = null;
    }
  }
  const momoPhone =
    instructions?.momo?.phoneNumber ||
    legalMeta?.momoPhone ||
    (campaign as Campaign & { fundraiser?: { phoneNumber?: string } })
      .fundraiser?.phoneNumber ||
    "0987654321";
  const momoName =
    instructions?.momo?.accountName || legalMeta?.momoAccountName || accName;
  const momoQrUrl =
    instructions?.momo?.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=2|99|${momoPhone}|${encodeURIComponent(momoName)}||0|0|${transferAmount}|${encodeURIComponent(transferCode)}|transfer_p2p`;
  const momoDeepLink =
    instructions?.momo?.deepLink || "momo://?action=payWithApp&isScanQR=true";

  const step =
    donation?.paymentStatus === "SUCCESS"
      ? 3
      : donation
        ? 2
        : 1;

  function resetDonation() {
    setDonation(null);
    setInstructions(null);
  }

  return (
    <Modal
      title="Gửi một phần sẻ chia"
      onClose={() => {
        if (!busy && !simulating) onClose();
      }}
    >
      <div className="donation-flow">
        <ol className="dm-steps" aria-label="Các bước đóng góp">
          <li className={step >= 1 ? "is-done" : ""} aria-current={step === 1 ? "step" : undefined}>
            <span className="dm-steps__n">1</span>
            Số tiền
          </li>
          <li className={step >= 2 ? "is-done" : ""} aria-current={step === 2 ? "step" : undefined}>
            <span className="dm-steps__n">2</span>
            Thanh toán
          </li>
          <li className={step >= 3 ? "is-done" : ""} aria-current={step === 3 ? "step" : undefined}>
            <span className="dm-steps__n">3</span>
            Hoàn tất
          </li>
        </ol>

        <p className="donation-campaign">{campaign.title}</p>
        {error && <Notice error>{error}</Notice>}

        {!donation ? (
          <form className="form-stack" onSubmit={submit}>
            <div className="amount-options">
              {[50000, 100000, 200000, 500000].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={amount === n ? "button" : "button secondary"}
                  aria-pressed={amount === n}
                  onClick={() => setAmount(n)}
                >
                  {formatCurrency(n)}
                </button>
              ))}
            </div>
            <Field label="Số tiền đóng góp (VND)">
              <input
                type="number"
                required
                min={10000}
                max={1000000000}
                step={1}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </Field>
            <Field label="Họ tên (không bắt buộc)">
              <input
                name="name"
                minLength={2}
                maxLength={150}
                defaultValue={user?.name || ""}
                placeholder="Nhập họ tên của bạn"
              />
            </Field>
            <Field label="Email (không bắt buộc)">
              <input
                name="email"
                type="email"
                defaultValue={user?.email || ""}
                placeholder="Nhập email để nhận thông báo xác nhận"
              />
            </Field>
            {!user && (
              <Field label="Số Căn cước công dân (Bắt buộc với khách vãng lai - 12 số)">
                <input
                  name="idCard"
                  type="text"
                  required
                  pattern="[0-9]{12}"
                  maxLength={12}
                  placeholder="Ví dụ: 001201012345"
                />
              </Field>
            )}
            <Field label="Lời nhắn">
              <textarea name="message" rows={3} maxLength={500} placeholder="Lời chúc gửi tới chiến dịch..." />
            </Field>
            <label className="check">
              <input type="checkbox" name="anonymous" />
              Ẩn tên trên danh sách đóng góp công khai
            </label>
            {!user && (
              <Notice>
                <strong>Quy định minh bạch & hoàn tiền:</strong> Khách vãng lai bắt buộc nhập số CCCD để lưu hồ sơ đối soát. Sau này nếu chiến dịch không thành công hoặc bạn cần hoàn tiền, chỉ cần tạo tài khoản mới với số CCCD này, hệ thống sẽ tự động liên kết toàn bộ lịch sử đóng góp cũ và mở quyền gửi đơn hoàn tiền.
              </Notice>
            )}
            <button className="button dm-btn-row" disabled={busy}>
              {busy ? (
                <>
                  <FiLoader className="spin" size={16} aria-hidden="true" /> Đang
                  tạo giao dịch…
                </>
              ) : (
                <>
                  <RiBankCardLine size={18} aria-hidden="true" /> Tiếp tục quét
                  mã VietQR
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="form-stack donation-result">
            {donation.paymentStatus === "SUCCESS" ? (
              <div className="dm-success">
                <div className="dm-success__icon" aria-hidden="true">
                  <RiCheckDoubleLine size={38} />
                </div>
                <h3>Thanh toán thành công!</h3>
                <p>
                  Hệ thống đã nhận được{" "}
                  <strong>{formatCurrency(transferAmount)}</strong> đóng góp vào
                  chiến dịch.
                </p>
                <p className="dm-success__meta">
                  Mã giao dịch: <strong>{donation.transactionCode}</strong>
                </p>
                <button type="button" className="button" onClick={onClose}>
                  Hoàn tất & Đóng
                </button>
              </div>
            ) : (
              <>
                <div className="dm-pay-head">
                  <Status value={donation.paymentStatus} />
                  <h3 className="num">{formatCurrency(transferAmount)}</h3>
                </div>

                {isExpired ? (
                  <div className="dm-banner dm-banner--danger">
                    <div className="dm-banner__title">
                      <RiLockLine size={20} aria-hidden="true" /> Phiên giao
                      dịch đã hết hạn & bị khóa
                    </div>
                    <p>
                      Giao dịch quá 10 phút chưa hoàn tất đã tự động bị khóa. Mã
                      QR và nội dung chuyển khoản đã hết hiệu lực trong hệ thống.
                      Quý vị vui lòng <strong>không chuyển tiền</strong> vào
                      phiên này để tránh sai sót.
                    </p>
                    <button
                      type="button"
                      className="button dm-btn-row"
                      onClick={resetDonation}
                    >
                      <RiRefreshLine size={16} aria-hidden="true" /> Tạo giao
                      dịch ủng hộ mới
                    </button>
                  </div>
                ) : (
                  <div
                    className={`dm-timer ${timeLeft <= 120 ? "dm-timer--urgent" : ""}`}
                  >
                    <div className="dm-timer__label">
                      <RiTimeLine size={17} aria-hidden="true" />
                      <span>Phiên thanh toán hết hạn sau:</span>
                    </div>
                    <strong className="dm-timer__value">
                      {formatCountdown(timeLeft)}
                    </strong>
                  </div>
                )}

                <div className="dm-tabs" role="tablist" aria-label="Phương thức thanh toán">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "VIETQR"}
                    className={`dm-tab ${activeTab === "VIETQR" ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveTab("VIETQR");
                      setQrLoaded(false);
                      setQrHasError(false);
                    }}
                  >
                    <RiBankCardLine size={18} aria-hidden="true" /> VietQR Napas
                    247
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "MOMO"}
                    className={`dm-tab dm-tab--momo ${activeTab === "MOMO" ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveTab("MOMO");
                      setQrLoaded(false);
                      setQrHasError(false);
                    }}
                  >
                    <RiWallet3Line size={18} aria-hidden="true" /> Ví điện tử
                    MoMo
                  </button>
                </div>

                {activeTab === "VIETQR" && (
                  <>
                    <div
                      className={`dm-qr-panel ${isExpired ? "is-expired" : ""}`}
                    >
                      <div
                        className={`dm-chip ${isExpired ? "dm-chip--danger" : "dm-chip--primary"}`}
                      >
                        {isExpired ? (
                          <>
                            <RiLockLine size={16} aria-hidden="true" /> Mã VietQR
                            đã hết hạn phiên
                          </>
                        ) : (
                          <>
                            <HiBolt size={16} aria-hidden="true" /> VietQR Napas
                            247 — Mở app ngân hàng quét mã
                          </>
                        )}
                      </div>
                      <div className="dm-qr-frame">
                        {isExpired ? (
                          <div className="dm-qr-locked">
                            <div className="dm-qr-locked__icon">
                              <RiLockLine size={28} aria-hidden="true" />
                            </div>
                            <strong>MÃ QR ĐÃ BỊ KHÓA</strong>
                            <span>
                              Phiên thanh toán đã hết hạn sau 10 phút. Không thể
                              quét mã này.
                            </span>
                          </div>
                        ) : (
                          <>
                            {!qrLoaded && (
                              <div className="dm-qr-loading">
                                <FiLoader
                                  className="spin"
                                  size={24}
                                  aria-hidden="true"
                                />
                                <span>Đang tải mã VietQR...</span>
                              </div>
                            )}
                            <img
                              src={qrHasError ? fallbackQrUrl : vietQrUrl}
                              alt="VietQR Napas 247"
                              className="dm-qr-img"
                              hidden={!qrLoaded}
                              onLoad={() => setQrLoaded(true)}
                              onError={() => {
                                if (!qrHasError) setQrHasError(true);
                                else setQrLoaded(true);
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className={`dm-details ${isExpired ? "is-dimmed" : ""}`}
                    >
                      <div className="dm-row">
                        <span>Ngân hàng thụ hưởng</span>
                        <strong>{bank}</strong>
                      </div>
                      <div className="dm-row">
                        <span>Số tài khoản</span>
                        <div className="dm-row__value">
                          <strong className="dm-mono">{accNumber}</strong>
                          <CopyBtn
                            copied={copiedKey === "accNumber"}
                            disabled={isExpired}
                            onClick={() =>
                              copyText(accNumber, "Số tài khoản", "accNumber")
                            }
                          />
                        </div>
                      </div>
                      <div className="dm-row">
                        <span>Tên chủ tài khoản</span>
                        <strong>{accName}</strong>
                      </div>
                      <div className="dm-row">
                        <span>Số tiền</span>
                        <div className="dm-row__value">
                          <strong className="dm-amount">
                            {formatCurrency(transferAmount)}
                          </strong>
                          <CopyBtn
                            copied={copiedKey === "amount"}
                            disabled={isExpired}
                            onClick={() =>
                              copyText(
                                String(transferAmount),
                                "Số tiền",
                                "amount",
                              )
                            }
                          />
                        </div>
                      </div>
                      <div
                        className={`dm-code-row ${isExpired ? "is-expired" : ""}`}
                      >
                        <span>Nội dung chuyển</span>
                        <div className="dm-row__value">
                          <strong className="dm-mono dm-code">
                            {transferCode}
                          </strong>
                          <CopyBtn
                            copied={copiedKey === "transferCode"}
                            disabled={isExpired}
                            tone="primary"
                            onClick={() =>
                              copyText(
                                transferCode,
                                "Nội dung chuyển khoản",
                                "transferCode",
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <p className="dm-hint">
                      <RiLightbulbLine size={16} aria-hidden="true" />
                      <span>
                        {isExpired
                          ? "Phiên đã hết hạn. Vui lòng tạo giao dịch ủng hộ mới để nhận mã QR và nội dung hợp lệ."
                          : "Khi quét mã VietQR, app ngân hàng sẽ tự điền toàn bộ thông tin."}
                      </span>
                    </p>
                  </>
                )}

                {activeTab === "MOMO" && (
                  <>
                    <div
                      className={`dm-qr-panel dm-qr-panel--momo ${isExpired ? "is-expired" : ""}`}
                    >
                      <div
                        className={`dm-chip ${isExpired ? "dm-chip--danger" : "dm-chip--momo"}`}
                      >
                        {isExpired ? (
                          <>
                            <RiLockLine size={16} aria-hidden="true" /> Mã MoMo
                            đã hết hạn phiên
                          </>
                        ) : (
                          <>
                            <RiWallet3Line size={16} aria-hidden="true" /> Ví
                            MoMo — Quét mã hoặc mở App
                          </>
                        )}
                      </div>
                      <div className="dm-qr-frame dm-qr-frame--momo">
                        {isExpired ? (
                          <div className="dm-qr-locked dm-qr-locked--momo">
                            <div className="dm-qr-locked__icon">
                              <RiLockLine size={28} aria-hidden="true" />
                            </div>
                            <strong>MÃ QR MOMO ĐÃ BỊ KHÓA</strong>
                            <span>
                              Phiên thanh toán đã quá 10 phút. Không thể quét mã
                              này.
                            </span>
                          </div>
                        ) : (
                          <>
                            {!qrLoaded && (
                              <div className="dm-qr-loading">
                                <FiLoader
                                  className="spin"
                                  size={24}
                                  aria-hidden="true"
                                />
                                <span>Đang tải mã MoMo...</span>
                              </div>
                            )}
                            <img
                              src={momoQrUrl}
                              alt="QR Ví MoMo"
                              className="dm-qr-img"
                              hidden={!qrLoaded}
                              onLoad={() => setQrLoaded(true)}
                            />
                          </>
                        )}
                      </div>
                      {!isExpired && (
                        <a href={momoDeepLink} className="dm-momo-link">
                          <FiSmartphone size={16} aria-hidden="true" /> Mở ứng
                          dụng MoMo (Trên điện thoại)
                        </a>
                      )}
                    </div>

                    <div
                      className={`dm-details dm-details--momo ${isExpired ? "is-dimmed" : ""}`}
                    >
                      <div className="dm-row">
                        <span>Số điện thoại MoMo</span>
                        <div className="dm-row__value">
                          <strong className="dm-mono dm-momo-phone">
                            {momoPhone}
                          </strong>
                          <CopyBtn
                            copied={copiedKey === "momoPhone"}
                            disabled={isExpired}
                            onClick={() =>
                              copyText(
                                momoPhone,
                                "Số điện thoại MoMo",
                                "momoPhone",
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="dm-row">
                        <span>Tên người nhận ví MoMo</span>
                        <strong>{momoName}</strong>
                      </div>
                      <div className="dm-row">
                        <span>Số tiền</span>
                        <div className="dm-row__value">
                          <strong className="dm-amount">
                            {formatCurrency(transferAmount)}
                          </strong>
                          <CopyBtn
                            copied={copiedKey === "momoAmount"}
                            disabled={isExpired}
                            onClick={() =>
                              copyText(
                                String(transferAmount),
                                "Số tiền",
                                "momoAmount",
                              )
                            }
                          />
                        </div>
                      </div>
                      <div
                        className={`dm-code-row dm-code-row--momo ${isExpired ? "is-expired" : ""}`}
                      >
                        <span>Lời nhắn MoMo</span>
                        <div className="dm-row__value">
                          <strong className="dm-mono dm-code">
                            {transferCode}
                          </strong>
                          <CopyBtn
                            copied={copiedKey === "momoCode"}
                            disabled={isExpired}
                            tone="momo"
                            onClick={() =>
                              copyText(
                                transferCode,
                                "Lời nhắn MoMo",
                                "momoCode",
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <p className="dm-hint">
                      <RiLightbulbLine size={16} aria-hidden="true" />
                      <span>
                        {isExpired
                          ? "Phiên đã hết hạn. Vui lòng tạo giao dịch ủng hộ mới để nhận mã QR và lời nhắn hợp lệ."
                          : "Mở MoMo quét mã QR sẽ tự động điền người nhận, số tiền và lời nhắn."}
                      </span>
                    </p>
                  </>
                )}

                <div className="dm-footer-actions">
                  {!isExpired && (
                    <button
                      type="button"
                      className="button dm-btn-row dm-confirm"
                      disabled={simulating}
                      onClick={handleSimulate}
                    >
                      {simulating ? (
                        <>
                          <FiLoader
                            className="spin"
                            size={16}
                            aria-hidden="true"
                          />{" "}
                          Đang xác nhận giao dịch...
                        </>
                      ) : (
                        <>
                          <FiZap size={16} aria-hidden="true" /> Tôi đã chuyển
                          tiền thành công — Hoàn tất
                        </>
                      )}
                    </button>
                  )}
                  <div className="dm-footer-links">
                    {isExpired && (
                      <button
                        type="button"
                        className="button secondary dm-btn-row"
                        onClick={resetDonation}
                      >
                        <RiRefreshLine size={14} aria-hidden="true" /> Tạo phiên
                        mới
                      </button>
                    )}
                    <Link
                      to={`/donations/${donation.id}`}
                      onClick={onClose}
                      className="dm-receipt-link"
                    >
                      <FiExternalLink size={13} aria-hidden="true" /> Xem trang
                      biên nhận đơn
                    </Link>
                  </div>
                </div>

                {!isExpired && (
                  <div className="dm-polling" role="status">
                    <FiLoader className="spin" size={14} aria-hidden="true" />
                    <span>
                      Hệ thống đang tự động lắng nghe chuyển tiền…
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
