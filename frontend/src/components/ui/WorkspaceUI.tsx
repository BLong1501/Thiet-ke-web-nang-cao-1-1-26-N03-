import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import {
  privateUploadPath,
  safeUrl,
  statusLabels,
} from "../../services/platform";

export function Page({
  title,
  intro,
  actions,
  children,
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} — FundTrust`;
  }, [title]);
  return (
    <div className="workspace container">
      <header className="page-heading">
        <div>
          <p className="eyebrow">FUNDTRUST / CÙNG NHAU TẠO THAY ĐỔI</p>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function RemoteState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return loading ? (
    <div className="loading-state" role="status">
      <span className="spinner" /> Đang tải dữ liệu…
    </div>
  ) : error ? (
    <Notice error>
      {error}{" "}
      <button className="button secondary" onClick={reload}>
        Thử lại
      </button>
    </Notice>
  ) : null;
}
export function Empty({
  children = "Chưa có dữ liệu để hiển thị.",
}: {
  children?: ReactNode;
}) {
  return <div className="empty-state">{children}</div>;
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value?.toLowerCase()}`}>
      {statusLabels[value?.toUpperCase()] || value}
    </span>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const labelControls = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child;
      const element = child as ReactElement<Record<string, any>>;
      if (
        typeof element.type === "string" &&
        ["input", "select", "textarea"].includes(element.type)
      ) {
        return cloneElement(element, {
          "aria-labelledby": id,
          "aria-describedby": hint ? `${id}-hint` : undefined,
        });
      }
      return element.props.children
        ? cloneElement(element, {}, labelControls(element.props.children))
        : child;
    });
  return (
    <label className="field">
      <span id={id}>{label}</span>
      {labelControls(children)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </label>
  );
}
export function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1 && page === 1) return null;
  return (
    <nav className="pager" aria-label="Phân trang">
      <button
        className="button secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </button>
      <span>
        Trang {page} / {pages}
      </span>
      <button
        className="button secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </button>
    </nav>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Đóng hộp thoại"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function SecureImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setUrl("");
    const path = privateUploadPath(src);
    if (path)
      api
        .get(path, { responseType: "blob" })
        .then((r) => {
          if (active) {
            objectUrl = URL.createObjectURL(r.data);
            setUrl(objectUrl);
          }
        })
        .catch(() => {});
    else setUrl(safeUrl(src));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url ? (
    <img
      className={className}
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setUrl("")}
    />
  ) : (
    <span className="image-unavailable">{alt} — ảnh chưa tải được</span>
  );
}
export function NotFound() {
  return (
    <Page title="Không tìm thấy trang">
      <Empty>
        Đường dẫn không tồn tại hoặc nội dung đã được gỡ.
        <p>
          <Link className="button" to="/campaigns">
            Khám phá chiến dịch
          </Link>
        </p>
      </Empty>
    </Page>
  );
}
