import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [organizer, setOrganizer] = useState(c?.organizerType || "INDIVIDUAL");
  const [coverUrl, setCoverUrl] = useState<string>(c?.coverImageUrl || "");
  const [localPreview, setLocalPreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaText, setMediaText] = useState("");
  const [mediaShots, setMediaShots] = useState<
    { key: string; preview: string; url: string }[]
  >([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaShotsRef = useRef(mediaShots);
  mediaShotsRef.current = mediaShots;

  const STEPS = [
    "Câu chuyện của bạn",
    "Mục tiêu gây quỹ",
    "Chủ thể & tài khoản",
  ] as const;

  let existingCommunityLink = "";
  try {
    if (c?.beneficiaryInfo) {
      const parsed =
        typeof c.beneficiaryInfo === "string"
          ? JSON.parse(c.beneficiaryInfo)
          : c.beneficiaryInfo;
      existingCommunityLink = parsed.communityLink || "";
    }
  } catch {
    // beneficiaryInfo là văn bản thường, không phải JSON
  }

  const [selectedBank, setSelectedBank] = useState<string>(c?.bankName || VIETNAM_BANKS[0].name);
  const [accountNumber, setAccountNumber] = useState<string>(c?.bankAccountNumber || "");

  useEffect(() => {
    return () => {
      if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    return () => {
      mediaShotsRef.current.forEach((shot) => {
        if (shot.preview.startsWith("blob:")) URL.revokeObjectURL(shot.preview);
      });
    };
  }, []);

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/jpg"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error("Chọn ảnh PNG/JPEG tối đa 5MB.");
      return;
    }
    if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    // Giữ blob để ảnh hiện ngay, kể cả khi URL máy chủ bị chặn cross-origin.
    setLocalPreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const res = await uploadApi.uploadPublicImage(file);
      setCoverUrl(res.url);
    } catch (err) {
      toast.error(errorMessage(err) || "Không thể tải ảnh lên máy chủ");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleMediaFiles(list: FileList | null) {
    const files = Array.from(list || []);
    if (!files.length || uploadingMedia) return;
    const accepted: { key: string; preview: string; file: File }[] = [];
    for (const file of files) {
      if (
        !["image/png", "image/jpeg", "image/jpg"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      ) {
        toast.error(`"${file.name}" không hợp lệ. Chọn ảnh PNG/JPEG tối đa 5MB.`);
        continue;
      }
      accepted.push({
        key: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
        file,
      });
    }
    if (!accepted.length) return;
    setMediaShots((prev) => [
      ...prev,
      ...accepted.map(({ key, preview }) => ({ key, preview, url: "" })),
    ]);
    setUploadingMedia(true);
    try {
      for (const shot of accepted) {
        try {
          const res = await uploadApi.uploadPublicImage(shot.file);
          if (!res?.url) throw new Error("Máy chủ chưa trả về đường dẫn ảnh.");
          setMediaShots((prev) =>
            prev.map((item) =>
              item.key === shot.key ? { ...item, url: res.url } : item,
            ),
          );
          setMediaText((prev) => {
            const lines = prev
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
            if (lines.includes(res.url)) return prev;
            return [...lines, res.url].join("\n");
          });
        } catch (err) {
          toast.error(errorMessage(err) || "Không thể tải ảnh minh chứng");
        }
      }
    } finally {
      setUploadingMedia(false);
    }
  }

  function removeMediaShot(key: string) {
    const shot = mediaShots.find((item) => item.key === key);
    if (!shot) return;
    if (shot.preview.startsWith("blob:")) URL.revokeObjectURL(shot.preview);
    setMediaShots((prev) => prev.filter((item) => item.key !== key));
    if (shot.url) {
      setMediaText((prev) =>
        prev
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && line !== shot.url)
          .join("\n"),
      );
    }
  }

  function goToStep(target: number) {
    if (busy || target === step) return;
    if (target < step) {
      setStep(target);
      return;
    }
    const form = formRef.current;
    if (!form) return;
    const panes = Array.from(
      form.querySelectorAll("fieldset"),
    ) as HTMLFieldSetElement[];
    for (let i = 0; i < target; i++) {
      const pane = panes[i];
      pane.hidden = false;
      const invalid = Array.from(pane.elements).find(
        (el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          (el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement) &&
          !el.disabled &&
          !el.validity.valid,
      );
      if (invalid) {
        panes.forEach((fs, idx) => {
          fs.hidden = idx !== i;
        });
        setStep(i);
        invalid.focus();
        invalid.reportValidity();
        toast.error(
          `Nhập đủ thông tin ở phần ${STEPS[i]} trước khi sang bước tiếp theo.`,
        );
        return;
      }
    }
    setStep(target);
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
    if (mediaShots.some((shot) => !shot.url)) {
      setStep(0);
      setError(
        "Ảnh minh chứng chưa tải xong. Đợi tải xong, hoặc xóa ảnh bị lỗi rồi gửi lại.",
      );
      return;
    }
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

    let mergedBeneficiaryInfo = value("beneficiaryInfo");
    if (value("communityLink")) {
      try {
        const obj = mergedBeneficiaryInfo ? JSON.parse(mergedBeneficiaryInfo) : {};
        obj.communityLink = value("communityLink");
        mergedBeneficiaryInfo = JSON.stringify(obj);
      } catch {
        mergedBeneficiaryInfo = JSON.stringify({
          details: mergedBeneficiaryInfo,
          communityLink: value("communityLink"),
        });
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
      beneficiaryInfo: mergedBeneficiaryInfo,
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
    <form
      ref={formRef}
      className="panel form-stack campaign-form"
      onSubmit={submit}
    >
      {error && <Notice error>{error}</Notice>}

      <ol className="wizard-progress" aria-label="Các bước tạo chiến dịch">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
          >
            <button type="button" onClick={() => goToStep(i)} disabled={busy}>
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
          hint="Chọn ảnh PNG/JPEG tối đa 5MB — ảnh hiện ngay trên form — hoặc dán URL."
        >
          <div className="cover-upload">
            {(localPreview || coverUrl) && (
              <div className="cover-upload__preview">
                <img
                  src={localPreview || coverUrl}
                  alt="Ảnh bìa chiến dịch"
                />
              </div>
            )}
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
              {(coverUrl || localPreview) && (
                <button
                  type="button"
                  className="cover-upload__remove"
                  disabled={uploadingImage}
                  onClick={() => {
                    if (localPreview.startsWith("blob:"))
                      URL.revokeObjectURL(localPreview);
                    setLocalPreview("");
                    setCoverUrl("");
                  }}
                >
                  Xóa ảnh
                </button>
              )}
            </div>
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
          <Field
            label="URL ảnh minh chứng (mỗi dòng một đường dẫn)"
            hint="Chọn ảnh PNG/JPEG tối đa 5MB — ảnh hiện ngay và đường dẫn được thêm vào ô bên dưới — hoặc dán URL, mỗi dòng một đường dẫn."
          >
            <div className="cover-upload">
              {mediaShots.length > 0 && (
                <div className="cover-upload__thumbs">
                  {mediaShots.map((shot, idx) => (
                    <div className="cover-upload__thumb" key={shot.key}>
                      <img
                        src={shot.preview || shot.url}
                        alt={`Ảnh minh chứng ${idx + 1}`}
                      />
                      <button
                        type="button"
                        aria-label={`Xóa ảnh minh chứng ${idx + 1}`}
                        disabled={uploadingMedia}
                        onClick={() => removeMediaShot(shot.key)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="cover-upload__actions">
                <label
                  className={`button secondary cover-upload__file ${uploadingMedia || busy ? "is-disabled" : ""}`}
                >
                  {uploadingMedia ? "Đang tải ảnh lên…" : "Chọn ảnh từ máy tính"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    disabled={uploadingMedia || busy}
                    onChange={(e) => {
                      handleMediaFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <textarea
                name="media"
                rows={3}
                value={mediaText}
                onChange={(e) => setMediaText(e.target.value)}
                placeholder="https://... mỗi dòng một đường dẫn"
              />
            </div>
          </Field>
        )}
        <Field
          label="Liên kết nhóm cộng đồng (Tùy chọn)"
          hint="Dán đường dẫn nhóm cộng đồng thảo luận (Ví dụ: /community?group=... hoặc nhóm trao đổi của dự án)"
        >
          <input
            name="communityLink"
            defaultValue={existingCommunityLink}
            placeholder="Ví dụ: /community?group=... hoặc link nhóm cộng đồng"
          />
        </Field>
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
            onClick={() => goToStep(step + 1)}
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
