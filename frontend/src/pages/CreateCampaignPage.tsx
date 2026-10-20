import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { campaignApi, uploadApi } from "../services/api";
import {
  campaignPath,
  errorMessage,
  payload,
  type RecordData,
} from "../services/platform";
import { useRemote } from "../hooks/useRemote";
import { useAuthStore } from "../store/authStore";
import { Page, Field, Notice, RemoteState } from "../components/ui/WorkspaceUI";
import toast from "react-hot-toast";
import { VIETNAM_BANKS } from "../data/vietnamBanks";
import { FiShield } from "react-icons/fi";
export default function CreateCampaignPage() {
  const { id } = useParams();
  const result = useRemote(async () => {
    const [categories, campaign] = await Promise.all([
      campaignApi.getCategories().then(payload),
      id ? campaignApi.getById(id).then(payload) : Promise.resolve(null),
    ]);
    return { categories, campaign };
  }, [id]);
  const user = useAuthStore((s) => s.user);
  const role = user?.role?.toUpperCase();

  if (role === "ADMIN") {
    return (
      <Page title="Không có quyền truy cập">
        <Notice error>
          Tài khoản Quản trị viên không thể tạo hoặc chỉnh sửa chiến dịch cá nhân.
          Vui lòng sử dụng trang Quản trị để kiểm duyệt chiến dịch.
        </Notice>
        <p>
          <Link className="button" to="/admin/campaigns">
            Đến trang Quản lý chiến dịch (Admin)
          </Link>
        </p>
      </Page>
    );
  }

  const canEdit =
    !result.data?.campaign ||
    (result.data.campaign.fundraiserId === user?.id &&
      ["DRAFT", "PENDING_APPROVAL"].includes(result.data.campaign.status));
  return (
    <Page
      title={id ? "Chỉnh sửa chiến dịch" : "Bắt đầu một điều tốt đẹp"}
      intro="Chia sẻ câu chuyện, đặt mục tiêu và cung cấp thông tin minh bạch."
      actions={<Link to="/dashboard">Về bảng điều khiển</Link>}
    >
      <RemoteState {...result} />
      {result.data &&
        (canEdit ? (
          <CampaignForm
            key={id || "new"}
            categories={result.data.categories}
            campaign={result.data.campaign}
          />
        ) : (
          <Notice error>
            Bạn không có quyền chỉnh sửa chiến dịch này hoặc trạng thái không
            cho phép chỉnh sửa.
          </Notice>
        ))}
    </Page>
  );
}
function CampaignForm({
  categories,
  campaign: c,
}: {
  categories: RecordData[];
  campaign: RecordData | null;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [organizer, setOrganizer] = useState(c?.organizerType || "INDIVIDUAL");
  const [coverUrl, setCoverUrl] = useState<string>(c?.coverImageUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  const STEPS = [
    "Câu chuyện của bạn",
    "Mục tiêu gây quỹ",
    "Chủ thể & tài khoản",
  ] as const;

  // Dữ liệu thụ hưởng / MoMo hiện có nếu chỉnh sửa
  let existingMomoPhone = "";
  let existingMomoName = "";
  try {
    if (c?.beneficiaryInfo) {
      const parsed = JSON.parse(c.beneficiaryInfo);
      existingMomoPhone = parsed.momoPhone || "";
      existingMomoName = parsed.momoAccountName || "";
    }
  } catch {
    // Không phải JSON
  }

  const [selectedBank, setSelectedBank] = useState<string>(c?.bankName || VIETNAM_BANKS[0].name);
  const [accountNumber, setAccountNumber] = useState<string>(c?.bankAccountNumber || "");
  const [enableMomo, setEnableMomo] = useState<boolean>(!!existingMomoPhone);
  const [momoPhone, setMomoPhone] = useState<string>(existingMomoPhone);
  const [momoName, setMomoName] = useState<string>(existingMomoName || user?.name || "");

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const res = await uploadApi.uploadPublicImage(file);
      setCoverUrl(res.url);
      toast.success("Tải ảnh từ máy tính thành công!");
    } catch (err) {
      toast.error(errorMessage(err) || "Không thể tải ảnh lên máy chủ");
    } finally {
      setUploadingImage(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const form = e.currentTarget;
    // Bật lại mọi bước để trình duyệt kiểm tra required đủ 3 phần
    form.querySelectorAll("fieldset").forEach((fs) => {
      (fs as HTMLFieldSetElement).hidden = false;
    });
    if (!form.reportValidity()) {
      const controls = Array.from(form.elements);
      const invalid = controls.find(
        (el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          (el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement) &&
          !el.disabled &&
          !el.validity.valid,
      );
      if (invalid) {
        const pane = invalid.closest("fieldset");
        const panes = Array.from(form.querySelectorAll("fieldset"));
        const idx = pane ? panes.indexOf(pane) : 0;
        setStep(Math.max(0, idx));
        panes.forEach((fs, i) => {
          (fs as HTMLFieldSetElement).hidden = i !== Math.max(0, idx);
        });
      }
      return;
    }
    const f = new FormData(form);
    const value = (key: string) => String(f.get(key) || "").trim();
    const start = value("startDate")
      ? new Date(value("startDate"))
      : new Date();
    const end = new Date(value("endDate"));
    if (!Number.isFinite(end.getTime()) || end <= start || end <= new Date()) {
      setError("Ngày kết thúc phải ở tương lai và sau ngày bắt đầu.");
      return;
    }
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement;
    const mediaUrls = value("media")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (mediaUrls.some((url) => !/^https?:\/\//i.test(url))) {
      setError(
        "Tài liệu minh chứng phải là URL HTTP hoặc HTTPS, mỗi dòng một URL.",
      );
      return;
    }

    const cleanStk = accountNumber.trim();
    if (!/^[0-9]{6,19}$/.test(cleanStk)) {
      setError("Số tài khoản ngân hàng không hợp lệ (chỉ được gồm 6 đến 19 chữ số).");
      return;
    }

    if (enableMomo) {
      if (!/^0[0-9]{9}$/.test(momoPhone.trim())) {
        setError("Số điện thoại MoMo không hợp lệ (phải gồm đúng 10 chữ số, bắt đầu bằng số 0).");
        return;
      }
    }

    const body = {
      title: value("title"),
      categoryId: value("categoryId"),
      shortDescription: value("shortDescription"),
      story: value("story"),
      coverImageUrl: value("coverImageUrl"),
      targetAmount: Number(value("targetAmount")),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bankName: selectedBank,
      bankAccountNumber: cleanStk,
      bankAccountName: organizer === "INDIVIDUAL" ? (user?.name || value("bankAccountName")) : value("bankAccountName"),
      beneficiaryInfo: value("beneficiaryInfo"),
      ...(enableMomo
        ? {
            momoPhone: momoPhone.trim(),
            momoAccountName: organizer === "INDIVIDUAL" ? (user?.name || momoName.trim()) : momoName.trim(),
          }
        : {}),
      organizerType: organizer,
      charityCommitmentAccepted: f.get("commitment") === "on",
      ...(organizer === "ORGANIZATION"
        ? {
            organizationName: value("organizationName"),
            taxCode: value("taxCode"),
            representativeRole: value("representativeRole"),
          }
        : {}),
      status: submitter?.value || "PENDING_APPROVAL",
      ...(!c
        ? { media: mediaUrls.map((url) => ({ mediaType: "IMAGE", url })) }
        : {}),
    };
    setBusy(true);
    try {
      const r = c
        ? await campaignApi.update(c.id, body)
        : await campaignApi.create(body);
      toast.success(
        body.status === "DRAFT"
          ? "Đã lưu bản nháp trên máy chủ."
          : "Đã gửi chiến dịch chờ duyệt.",
      );
      navigate(campaignPath(payload(r)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-stack campaign-form" onSubmit={submit}>
      {error && <Notice error>{error}</Notice>}

      <ol className="wizard-progress" aria-label="Các bước tạo chiến dịch">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
          >
            <button type="button" onClick={() => setStep(i)} disabled={busy}>
              <span className="wizard-progress__n">{i + 1}</span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <fieldset disabled={busy} hidden={step !== 0}>
        <legend>01 / Câu chuyện của bạn</legend>
        <Field label="Tên chiến dịch">
          <input
            name="title"
            required
            minLength={10}
            maxLength={255}
            defaultValue={c?.title}
          />
        </Field>
        <Field label="Danh mục">
          <select
            name="categoryId"
            required
            defaultValue={c?.categoryId || ""}
          >
            <option value="" disabled>
              Chọn danh mục
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mô tả ngắn">
          <textarea
            name="shortDescription"
            required
            minLength={20}
            maxLength={500}
            rows={3}
            defaultValue={c?.shortDescription}
          />
        </Field>
        <Field
          label="Câu chuyện và kế hoạch sử dụng quỹ"
          hint="Ít nhất 50 ký tự. Trình bày hoàn cảnh, mục tiêu và cách thực hiện."
        >
          <textarea
            name="story"
            required
            minLength={50}
            rows={8}
            defaultValue={c?.story}
          />
        </Field>
        <Field
          label="Ảnh bìa chiến dịch"
          hint="Bạn có thể tải ảnh trực tiếp từ máy tính (PNG/JPEG tối đa 5MB) hoặc nhập URL công khai."
        >
          <div className="cover-upload">
            <div className="cover-upload__actions">
              <label
                className={`button secondary cover-upload__file ${uploadingImage || busy ? "is-disabled" : ""}`}
              >
                {uploadingImage ? "Đang tải ảnh lên…" : "Chọn ảnh từ máy tính"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  disabled={uploadingImage || busy}
                  onChange={handleImageFileChange}
                />
              </label>
              {coverUrl && (
                <button
                  type="button"
                  className="cover-upload__remove"
                  onClick={() => setCoverUrl("")}
                >
                  Xóa ảnh đã chọn
                </button>
              )}
            </div>
            {coverUrl && (
              <div className="cover-upload__preview">
                <img src={coverUrl} alt="Ảnh bìa xem trước" />
              </div>
            )}
            <input
              name="coverImageUrl"
              type="text"
              required
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="Hoặc dán đường dẫn ảnh https://..."
            />
          </div>
        </Field>
        {!c && (
          <Field label="URL ảnh minh chứng (mỗi dòng một đường dẫn)">
            <textarea name="media" rows={3} />
          </Field>
        )}
      </fieldset>

      <fieldset disabled={busy} hidden={step !== 1}>
        <legend>02 / Mục tiêu gây quỹ</legend>
        <div className="form-grid">
          <Field label="Mục tiêu (VND)">
            <input
              name="targetAmount"
              type="number"
              min={100000}
              max={1000000000000}
              step={1000}
              required
              defaultValue={c?.targetAmount}
            />
          </Field>
          <Field label="Người thụ hưởng">
            <input
              name="beneficiaryInfo"
              maxLength={1000}
              defaultValue={c?.beneficiaryDetails || ""}
            />
          </Field>
          <Field label="Ngày bắt đầu">
            <input
              name="startDate"
              type="datetime-local"
              defaultValue={c?.startDate ? localDate(c.startDate) : ""}
            />
          </Field>
          <Field label="Ngày kết thúc">
            <input
              name="endDate"
              type="datetime-local"
              required
              defaultValue={c?.endDate ? localDate(c.endDate) : ""}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset disabled={busy} hidden={step !== 2}>
        <legend>03 / Chủ thể và tài khoản nhận tiền</legend>
        <Field label="Chủ thể gây quỹ">
          <select
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
          >
            <option value="INDIVIDUAL">Cá nhân</option>
            <option value="ORGANIZATION">Tổ chức</option>
          </select>
        </Field>
        {organizer === "ORGANIZATION" && (
          <>
            <Field label="Tên tổ chức">
              <input
                name="organizationName"
                required
                minLength={3}
                maxLength={255}
                defaultValue={c?.organizationName}
              />
            </Field>
            <Field label="Mã số thuế">
              <input
                name="taxCode"
                required
                pattern="([0-9]{10}|[0-9]{13}|[0-9]{10}-[0-9]{3})"
                defaultValue={c?.taxCode}
              />
            </Field>
            <Field label="Vai trò người đại diện">
              <input
                name="representativeRole"
                required
                minLength={2}
                maxLength={100}
                defaultValue={c?.representativeRole}
              />
            </Field>
          </>
        )}
        <div className="escrow-notice">
          <FiShield size={22} aria-hidden="true" />
          <div>
            <strong>Cơ chế Ký quỹ Minh bạch (FundTrust Escrow):</strong>
            <p>
              Mọi khoản đóng góp của Nhà hảo tâm sẽ được chuyển trực tiếp vào{" "}
              <strong>Tài khoản Quỹ trung tâm (MBBank - 0344907168 - TRAN BAO LONG)</strong>.
              Tài khoản ngân hàng bạn cung cấp dưới đây là{" "}
              <strong>
                tài khoản thụ hưởng của Chủ chiến dịch dùng để nhận tiền giải ngân
              </strong>{" "}
              sau khi được Ban quản trị thẩm định hóa đơn chứng từ.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <Field
            label="Ngân hàng nhận giải ngân (Chuẩn Napas 247)"
            hint="Chọn ngân hàng của bạn để nhận tiền giải ngân khi được Admin phê duyệt"
          >
            <select
              name="bankName"
              required
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.bin} value={b.name}>
                  {b.shortName} - {b.name} (BIN: {b.bin})
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Số tài khoản nhận giải ngân"
            hint="Số tài khoản ngân hàng chính chủ của bạn (gồm 6 đến 19 chữ số)"
          >
            <input
              name="bankAccountNumber"
              required
              inputMode="numeric"
              pattern="^[0-9]{6,19}$"
              minLength={6}
              maxLength={19}
              placeholder="Ví dụ: 0987654321"
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))
              }
            />
          </Field>
        </div>

        <Field
          label="Tên chủ tài khoản"
          hint={
            organizer === "INDIVIDUAL"
              ? `Hệ thống khóa theo Họ tên KYC đã xác thực (${user?.name || "Người gây quỹ"}). Không dùng tài khoản của người khác.`
              : "Tên pháp nhân hoặc chủ tài khoản đại diện cơ quan / tổ chức."
          }
        >
          <input
            name="bankAccountName"
            required
            minLength={2}
            maxLength={150}
            readOnly={organizer === "INDIVIDUAL"}
            className={organizer === "INDIVIDUAL" ? "input-locked" : undefined}
            defaultValue={
              organizer === "INDIVIDUAL"
                ? user?.name
                : c?.bankAccountName || user?.name
            }
          />
        </Field>

        <div className="momo-opt-in">
          <label className="check">
            <input
              type="checkbox"
              checked={enableMomo}
              onChange={(e) => setEnableMomo(e.target.checked)}
            />
            Bật tùy chọn nhận quyên góp qua Ví điện tử MoMo
          </label>
          <p>
            Cho phép nhà hảo tâm chuyển tiền nhanh bằng App MoMo hoặc quét mã QR
            MoMo P2P.
          </p>
          {enableMomo && (
            <div className="form-grid">
              <Field
                label="Số điện thoại MoMo"
                hint="Số điện thoại đăng ký ví MoMo (10 chữ số, bắt đầu bằng số 0)"
              >
                <input
                  name="momoPhone"
                  required={enableMomo}
                  inputMode="numeric"
                  pattern="^0[0-9]{9}$"
                  maxLength={10}
                  placeholder="Ví dụ: 0987654321"
                  value={momoPhone}
                  onChange={(e) =>
                    setMomoPhone(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </Field>
              <Field
                label="Tên chủ ví MoMo"
                hint={
                  organizer === "INDIVIDUAL"
                    ? `Khóa theo tên KYC (${user?.name})`
                    : "Tên chủ ví MoMo đại diện"
                }
              >
                <input
                  name="momoAccountName"
                  required={enableMomo}
                  readOnly={organizer === "INDIVIDUAL"}
                  className={
                    organizer === "INDIVIDUAL" ? "input-locked" : undefined
                  }
                  value={
                    organizer === "INDIVIDUAL" ? user?.name || "" : momoName
                  }
                  onChange={(e) => setMomoName(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>
        <label className="check">
          <input
            name="commitment"
            type="checkbox"
            required
            defaultChecked={!!c?.charityCommitment?.isAccepted}
          />
          Tôi cam kết thông tin chính xác, công khai việc sử dụng quỹ và tài
          khoản chỉ phục vụ mục đích từ thiện.
        </label>
      </fieldset>

      <div className="wizard-nav">
        {step > 0 ? (
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => setStep((s) => s - 1)}
          >
            Quay lại
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => setStep((s) => s + 1)}
          >
            Tiếp tục
          </button>
        ) : (
          <div className="actions">
            <button className="button secondary" disabled={busy} value="DRAFT">
              Lưu bản nháp
            </button>
            <button
              className="button"
              disabled={busy || !categories.length}
              value="PENDING_APPROVAL"
            >
              {busy ? "Đang lưu…" : "Gửi xét duyệt"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
function localDate(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
