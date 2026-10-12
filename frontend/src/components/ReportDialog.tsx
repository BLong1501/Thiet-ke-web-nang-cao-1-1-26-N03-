import { useState, type FormEvent } from "react";
import axios from "axios";
import { reportApi } from "../services/api";
import { errorMessage } from "../services/platform";
import { Field, Modal, Notice } from "./ui/WorkspaceUI";
import toast from "react-hot-toast";
export default function ReportDialog({
  targetId,
  onClose,
}: {
  targetId: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await reportApi.create({
        targetType: "CAMPAIGN",
        targetId,
        reason: String(f.get("reason")).trim(),
        description: String(f.get("description")).trim(),
      });
      toast.success("Đã gửi báo cáo đến quản trị viên.");
      onClose();
    } catch (e: unknown) {
      setError(
        axios.isAxiosError(e) && e.response?.status === 404
          ? "Dịch vụ tiếp nhận báo cáo chưa khả dụng. Báo cáo chưa được gửi."
          : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Báo cáo chiến dịch"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="form-stack" onSubmit={submit}>
        {error && <Notice error>{error}</Notice>}
        <Field label="Lý do báo cáo">
          <select name="reason">
            <option>Thông tin không chính xác</option>
            <option>Nghi ngờ giả mạo</option>
            <option>Thiếu minh bạch</option>
            <option>Nội dung không phù hợp</option>
            <option>Khác</option>
          </select>
        </Field>
        <Field label="Thông tin chi tiết">
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={2000}
            rows={5}
          />
        </Field>
        <button className="button" disabled={busy}>
          Gửi báo cáo
        </button>
      </form>
    </Modal>
  );
}
