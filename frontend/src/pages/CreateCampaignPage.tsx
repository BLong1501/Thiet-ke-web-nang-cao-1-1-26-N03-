import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { campaignApi } from "../services/api";
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
  const canEdit =
    !result.data?.campaign ||
    user?.role?.toUpperCase() === "ADMIN" ||
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
  const [organizer, setOrganizer] = useState(c?.organizerType || "INDIVIDUAL");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const f = new FormData(e.currentTarget);
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
    const body = {
      title: value("title"),
      categoryId: value("categoryId"),
      shortDescription: value("shortDescription"),
      story: value("story"),
      coverImageUrl: value("coverImageUrl"),
      targetAmount: Number(value("targetAmount")),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bankName: value("bankName"),
      bankAccountNumber: value("bankAccountNumber"),
      bankAccountName: value("bankAccountName"),
      beneficiaryInfo: value("beneficiaryInfo"),
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
      <fieldset disabled={busy}>
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
          <select name="categoryId" required defaultValue={c?.categoryId || ""}>
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
          label="URL ảnh bìa công khai"
          hint="Dùng đường dẫn HTTPS có thể xem công khai. Ảnh KYC riêng tư không dùng làm ảnh bìa."
        >
          <input
            name="coverImageUrl"
            type="url"
            pattern="https?://.*"
            required
            defaultValue={c?.coverImageUrl}
          />
        </Field>
        {!c && (
          <Field label="URL ảnh minh chứng (mỗi dòng một đường dẫn)">
            <textarea name="media" rows={3} />
          </Field>
        )}
      </fieldset>
      <fieldset disabled={busy}>
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
      <fieldset disabled={busy}>
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
        <div className="form-grid">
          <Field label="Tên ngân hàng">
            <input
              name="bankName"
              required
              minLength={2}
              maxLength={100}
              defaultValue={c?.bankName}
            />
          </Field>
          <Field label="Số tài khoản">
            <input
              name="bankAccountNumber"
              required
              minLength={6}
              maxLength={50}
              defaultValue={c?.bankAccountNumber}
            />
          </Field>
        </div>
        <Field
          label="Tên chủ tài khoản"
          hint="Với cá nhân, tên chủ tài khoản phải trùng tên người gây quỹ đã xác minh."
        >
          <input
            name="bankAccountName"
            required
            minLength={2}
            maxLength={150}
            defaultValue={c?.bankAccountName || user?.name}
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
    </form>
  );
}
function localDate(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
