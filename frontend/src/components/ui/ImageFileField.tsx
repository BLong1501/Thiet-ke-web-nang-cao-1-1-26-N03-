import { useEffect, useState, type ChangeEvent } from "react";
import toast from "react-hot-toast";
import { api, uploadApi } from "../../services/api";
import { errorMessage } from "../../services/platform";

const MAX_BYTES = 5 * 1024 * 1024;

function allowedImage(file: File) {
  return (
    ["image/png", "image/jpeg", "image/jpg"].includes(file.type) &&
    file.size <= MAX_BYTES
  );
}

async function uploadPublic(file: File) {
  const res = await uploadApi.uploadPublicImage(file);
  if (!res.url) throw new Error("Máy chủ chưa trả về đường dẫn ảnh.");
  return res.url;
}

async function uploadPrivate(file: File) {
  const data = await uploadApi.uploadFile(file);
  if (!data.downloadUrl) throw new Error("Máy chủ chưa trả về đường dẫn ảnh.");
  const origin = new URL(api.defaults.baseURL!, window.location.origin).origin;
  return new URL(data.downloadUrl, origin).href;
}

export default function ImageFileField({
  alt,
  value,
  onChange,
  mode = "public",
  name,
  required = false,
  allowUrl = true,
  placeholder = "Hoặc dán đường dẫn ảnh https://...",
  pattern,
  maxLength,
  previewClassName = "",
  disabled = false,
}: {
  alt: string;
  value: string;
  onChange: (url: string) => void;
  mode?: "public" | "private";
  name?: string;
  required?: boolean;
  allowUrl?: boolean;
  placeholder?: string;
  pattern?: string;
  maxLength?: number;
  previewClassName?: string;
  disabled?: boolean;
}) {
  const [localPreview, setLocalPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled || uploading) return;
    if (!allowedImage(file)) {
      toast.error("Chọn ảnh PNG/JPEG tối đa 5MB.");
      return;
    }
    if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = mode === "private" ? await uploadPrivate(file) : await uploadPublic(file);
      onChange(url);
    } catch (err) {
      toast.error(errorMessage(err) || "Không thể tải ảnh lên máy chủ");
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setLocalPreview("");
    onChange("");
  }

  const shown = localPreview || value;
  return (
    <div className="cover-upload">
      {shown && (
        <div className={`cover-upload__preview ${previewClassName}`.trim()}>
          <img src={shown} alt={alt} />
        </div>
      )}
      <div className="cover-upload__actions">
        <label
          className={`button secondary cover-upload__file ${uploading || disabled ? "is-disabled" : ""}`}
        >
          {uploading ? "Đang tải ảnh lên…" : "Chọn ảnh từ máy tính"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            disabled={uploading || disabled}
            required={required && !value}
            onChange={onFile}
          />
        </label>
        {shown && (
          <button
            type="button"
            className="cover-upload__remove"
            disabled={uploading || disabled}
            onClick={clear}
          >
            Xóa ảnh
          </button>
        )}
      </div>
      {allowUrl && (
        <input
          name={name}
          type="text"
          required={required}
          pattern={pattern}
          maxLength={maxLength}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
