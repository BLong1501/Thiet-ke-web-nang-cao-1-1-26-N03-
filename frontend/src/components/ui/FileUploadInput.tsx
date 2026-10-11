import { useState, useRef } from "react";
import { uploadApi, api } from "../../services/api";
import { errorMessage } from "../../services/platform";
import { Field, Notice, SecureImage } from "./WorkspaceUI";
interface Props {
  label?: string;
  helperText?: string;
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  placeholder?: string;
  required?: boolean;
}
export default function FileUploadInput({
  label = "Ảnh tài liệu",
  helperText,
  value = "",
  onChange,
  required,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file || busy) return;
    setError("");
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Chọn ảnh PNG/JPEG có dung lượng tối đa 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const data = await uploadApi.uploadFile(file);
      if (!data.downloadUrl)
        throw new Error("Máy chủ chưa trả về đường dẫn ảnh.");
      const origin = new URL(api.defaults.baseURL!, window.location.origin)
        .origin;
      onChange(new URL(data.downloadUrl, origin).href);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="upload-field">
      <Field
        label={label}
        hint={
          helperText ||
          "Ảnh riêng tư, chỉ bạn và quản trị viên được xem. PNG/JPEG, tối đa 5 MB."
        }
      >
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          disabled={busy}
          required={required && !value}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </Field>
      {busy && <Notice>Đang tải ảnh lên…</Notice>}
      {error && <Notice error>{error}</Notice>}
      {value && (
        <div className="upload-preview">
          <SecureImage src={value} alt={label} />
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() => onChange("")}
          >
            Gỡ ảnh
          </button>
        </div>
      )}
    </div>
  );
}
export { FileUploadInput };
