import { useState, type FormEvent } from "react";
import { campaignApi } from "../../services/api";
import { errorMessage, type RecordData } from "../../services/platform";
import { Field, Notice } from "../ui/WorkspaceUI";
import Tabs from "../ui/Tabs";
import toast from "react-hot-toast";
export default function ManageCampaign({
  campaign,
  reload,
}: {
  campaign: RecordData;
  reload: () => void;
}) {
  const [kind, setKind] = useState("update");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const v = (key: string) => String(f.get(key) || "").trim();
    setBusy(true);
    setError("");
    try {
      if (kind === "update")
        await campaignApi.postUpdate(campaign.id, {
          title: v("title"),
          content: v("content"),
        });
      else if (kind === "media")
        await campaignApi.addMedia(campaign.id, {
          mediaType: v("type") as "IMAGE" | "VIDEO" | "DOCUMENT",
          url: v("url"),
          caption: v("title"),
        });
      else
        await campaignApi.addDisbursement(campaign.id, {
          title: v("title"),
          amount: Number(v("amount")),
          disbursementDate: v("date"),
          proofDocuments: v("proof")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          note: v("note"),
        });
      toast.success("Đã lưu thông tin lên máy chủ.");
      form.reset();
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Cập nhật chiến dịch</h2>
      <Tabs
        label="Loại cập nhật"
        tabs={[
          { id: "update", label: "Nhật ký" },
          { id: "media", label: "Tài liệu" },
          { id: "disbursement", label: "Giải ngân" },
        ]}
        value={kind}
        onChange={(id) => {
          setKind(id);
          setError("");
        }}
      >
        <form key={kind} className="form-stack" onSubmit={submit}>
          {error && <Notice error>{error}</Notice>}
          <Field label={kind === "media" ? "Chú thích" : "Tiêu đề"}>
            <input
              name="title"
              required={kind !== "media"}
              minLength={kind === "media" ? 0 : 5}
              maxLength={255}
            />
          </Field>
          {kind === "update" && (
            <Field label="Nội dung cập nhật">
              <textarea name="content" required minLength={20} rows={5} />
            </Field>
          )}
          {kind === "media" && (
            <>
              <Field label="Loại tài liệu">
                <select name="type">
                  <option value="IMAGE">Ảnh</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Tài liệu</option>
                </select>
              </Field>
              <Field label="URL công khai">
                <input name="url" type="url" pattern="https?://.*" required />
              </Field>
            </>
          )}
          {kind === "disbursement" && (
            <>
              <Field label="Số tiền (VND)">
                <input
                  name="amount"
                  type="number"
                  required
                  min={10000}
                  step={1}
                />
              </Field>
              <Field label="Ngày giải ngân">
                <input name="date" type="date" required />
              </Field>
              <Field label="URL chứng từ công khai, mỗi dòng một URL">
                <textarea name="proof" required rows={3} />
              </Field>
              <Field label="Ghi chú">
                <textarea name="note" maxLength={1000} />
              </Field>
            </>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Đang lưu…" : "Đăng thông tin"}
          </button>
        </form>
      </Tabs>
    </>
  );
}
