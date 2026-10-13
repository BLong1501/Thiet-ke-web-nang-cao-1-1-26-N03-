import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type ReactElement,
} from "react";
import { Link, useLocation } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuInbox,
  LuInfo,
  LuSearchX,
  LuServerCrash,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";
import Seo from "../Seo";
import { api } from "../../services/api";
import {
  privateUploadPath,
  safeUrl,
  statusLabels,
} from "../../services/platform";

export interface Crumb {
  label: string;
  to?: string;
}

/** Các nhánh có trang cha; breadcrumb được suy ra từ đường dẫn hiện tại. */
const CRUMB_ROOTS: [path: string, label: string][] = [
  ["/admin", "Quản trị"],
  ["/campaigns", "Chiến dịch"],
  ["/dashboard", "Bảng điều khiển"],
];

function crumbsFor(pathname: string, title: string): Crumb[] {
  const parents = CRUMB_ROOTS.filter(([path]) =>
    pathname.startsWith(`${path}/`),
  );
  if (!parents.length) return [];
  return [...parents.map(([to, label]) => ({ to, label })), { label: title }];
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Vị trí trang">
      <ol>
        {items.map((item) => (
          <li key={item.to ?? item.label}>
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Page({
  title,
  intro,
  actions,
  children,
  description,
  image,
  noindex,
  canonicalPath,
  breadcrumbs,
  heading = "full",
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Mô tả SEO; mặc định dùng `intro`. */
  description?: string;
  image?: string;
  noindex?: boolean;
  canonicalPath?: string;
  /** Ghi đè breadcrumb tự suy ra; truyền `[]` để ẩn. */
  breadcrumbs?: Crumb[];
  /**
   * `full`: breadcrumb + h1 + intro + actions (mặc định).
   * `crumb`: chỉ breadcrumb — trang tự vẽ tiêu đề editorial (vd. chi tiết chiến dịch).
   */
  heading?: "full" | "crumb";
}) {
  const { pathname } = useLocation();
  const crumbs = breadcrumbs ?? crumbsFor(pathname, title);
  const showTitle = heading === "full";
  const shell = ["workspace", "container", heading === "crumb" && "editorial"]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={shell}>
      <Seo
        title={title}
        description={description || intro}
        image={image}
        noindex={noindex}
        canonicalPath={canonicalPath}
      />
      {(crumbs.length > 0 || showTitle) && (
        <header
          className={showTitle ? "page-heading" : "page-heading crumb-only"}
        >
          <div>
            {crumbs.length > 0 && <Breadcrumb items={crumbs} />}
            {showTitle && <h1>{title}</h1>}
            {showTitle && intro && <p>{intro}</p>}
          </div>
          {showTitle && actions && <div className="actions">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}

type Tone = "info" | "success" | "warning" | "error";
const NOTICE_ICONS: Record<Tone, IconType> = {
  info: LuInfo,
  success: LuCircleCheck,
  warning: LuTriangleAlert,
  error: LuCircleAlert,
};

export function Notice({
  children,
  error = false,
  tone,
}: {
  children: ReactNode;
  /** Giữ tương thích: tương đương `tone="error"`. */
  error?: boolean;
  tone?: Tone;
}) {
  const kind = tone ?? (error ? "error" : "info");
  const Icon = NOTICE_ICONS[kind];
  return (
    <div
      className={`notice notice-${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({
  lines = 3,
  label = "Đang tải dữ liệu…",
}: {
  lines?: number;
  label?: string;
}) {
  return (
    <div className="skeleton-group" role="status">
      <span className="visually-hidden">{label}</span>
      <span className="skeleton title" aria-hidden="true" />
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton" aria-hidden="true" />
      ))}
    </div>
  );
}

export function CampaignGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="campaign-grid" role="status">
      <span className="visually-hidden">Đang tải chiến dịch…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <span className="skeleton media" />
          <span className="skeleton title" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      ))}
    </div>
  );
}

/**
 * Trạng thái lỗi khi tải dữ liệu. 404 là "không tìm thấy" (không có nút thử lại);
 * 5xx, lỗi mạng và lỗi khác luôn hiển thị kèm nút thử lại.
 */
export function ErrorState({
  status,
  message,
  onRetry,
}: {
  status?: number;
  message: string;
  onRetry?: () => void;
}) {
  const kind =
    status === undefined
      ? "network"
      : status === 404
        ? "not-found"
        : status >= 500
          ? "server"
          : "client";
  const Icon =
    kind === "not-found"
      ? LuSearchX
      : kind === "server"
        ? LuServerCrash
        : LuCircleAlert;
  const title =
    kind === "not-found"
      ? "Không tìm thấy nội dung"
      : kind === "server"
        ? "Máy chủ đang gặp sự cố"
        : "Không thể tải dữ liệu";
  return (
    <div className={`error-state ${kind}`} role="alert">
      <span className="state-icon" aria-hidden="true">
        <Icon />
      </span>
      <p className="state-title">{title}</p>
      <p className="state-message">{message}</p>
      {kind === "not-found" ? (
        <Link className="button secondary" to="/campaigns">
          Khám phá chiến dịch
        </Link>
      ) : (
        onRetry && (
          <button className="button secondary" onClick={onRetry}>
            Thử lại
          </button>
        )
      )}
    </div>
  );
}

export function RemoteState({
  loading,
  error,
  reload,
  status,
  skeleton,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
  status?: number;
  /** Khung chờ riêng (vd. lưới thẻ); mặc định là các dòng skeleton. */
  skeleton?: ReactNode;
}) {
  if (loading) return <>{skeleton ?? <Skeleton />}</>;
  if (!error) return null;
  return <ErrorState status={status} message={error} onRetry={reload} />;
}

export function Empty({
  children = "Chưa có dữ liệu để hiển thị.",
  title,
  icon: Icon = LuInbox,
}: {
  children?: ReactNode;
  title?: string;
  icon?: IconType;
}) {
  return (
    <div className="empty-state">
      <span className="state-icon" aria-hidden="true">
        <Icon />
      </span>
      {title && <p className="state-title">{title}</p>}
      <div className="state-message">{children}</div>
    </div>
  );
}

export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value?.toLowerCase()}`}>
      {statusLabels[value?.toUpperCase()] || value}
    </span>
  );
}

export function Badge({
  tone = "neutral",
  icon: Icon,
  className,
  children,
}: {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  icon?: IconType;
  className?: string;
  children: ReactNode;
}) {
  const classes = ["badge", tone !== "neutral" && tone, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Thanh tiến độ. Không có `label` thì chỉ mang tính trang trí (giá trị đã hiển thị bằng chữ). */
export function Meter({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const a11y = label
    ? {
        role: "progressbar",
        "aria-label": label,
        "aria-valuenow": v,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
      }
    : { "aria-hidden": true };
  return (
    <div
      className={v >= 100 ? "meter complete" : "meter"}
      style={{ "--meter-value": `${v}%` } as CSSProperties}
      {...a11y}
    >
      <span />
    </div>
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
      const element = child as ReactElement<{
        children?: ReactNode;
        "aria-labelledby"?: string;
        "aria-describedby"?: string;
      }>;
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
        <LuChevronLeft aria-hidden="true" />
        Trước
      </button>
      <span className="pager-status" aria-live="polite">
        Trang <strong>{page}</strong> / {pages}
      </span>
      <button
        className="button secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Sau
        <LuChevronRight aria-hidden="true" />
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
          <LuX aria-hidden="true" />
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
      <Empty icon={LuSearchX} title="Đường dẫn không tồn tại">
        Nội dung có thể đã được gỡ hoặc địa chỉ bị gõ nhầm.
        <p>
          <Link className="button" to="/campaigns">
            Khám phá chiến dịch
          </Link>
        </p>
      </Empty>
    </Page>
  );
}
