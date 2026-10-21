import { Field } from "./WorkspaceUI";
import ImageFileField from "./ImageFileField";

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
  return (
    <Field
      label={label}
      hint={
        helperText ||
        "Chọn ảnh PNG/JPEG tối đa 5MB — ảnh hiện ngay trên form. Ảnh riêng tư, chỉ bạn và quản trị viên được xem."
      }
    >
      <ImageFileField
        alt={label}
        value={value}
        onChange={onChange}
        mode="private"
        required={required}
        allowUrl={false}
        previewClassName="cover-upload__preview--doc"
      />
    </Field>
  );
}

export { FileUploadInput };
