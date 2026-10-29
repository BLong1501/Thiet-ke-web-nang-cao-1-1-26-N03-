import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: number;
  badgeVariant?: "danger" | "warning" | "neutral";
  highlightPending?: boolean;
}

interface TabsProps {
  /** Nhãn truy cập của danh sách tab (đọc bởi trình đọc màn hình). */
  label: string;
  tabs: TabItem[];
  /** id của tab đang chọn. */
  value: string;
  onChange: (id: string) => void;
  /** Nội dung của tab đang chọn (tabpanel). */
  children: ReactNode;
  panelClassName?: string;
}

/**
 * Tabs theo mẫu WAI-ARIA Authoring Practices (kích hoạt tự động):
 * - role tablist / tab / tabpanel, aria-selected, aria-controls, aria-labelledby
 * - roving tabindex: chỉ tab đang chọn nằm trong thứ tự Tab
 * - ← → di chuyển và chọn tab (vòng tròn), Home/End về đầu/cuối
 * - Khi danh sách tràn ngang: fade hai mép + thanh cuộn mảnh để biết còn mục.
 */
export default function Tabs({
  label,
  tabs,
  value,
  onChange,
  children,
  panelClassName,
}: TabsProps) {
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setOverflow({
        start: el.scrollLeft > 4,
        end: max > 4 && el.scrollLeft < max - 4,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [tabs.length, value]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = tabs[next];
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  const shellClass = [
    "tabs-shell",
    overflow.start && "has-start",
    overflow.end && "has-end",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={shellClass}>
        <div className="tabs" role="tablist" aria-label={label} ref={scroller}>
          {tabs.map((tab, index) => {
            const selected = tab.id === value;
            const hasBadge = typeof tab.badge === "number" && tab.badge > 0;
            const isPending = hasBadge || tab.highlightPending;
            const btnClass = [
              selected ? "active" : "",
              isPending ? "has-pending" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={tab.id}
                ref={(el) => {
                  refs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${base}-panel`}
                tabIndex={selected ? 0 : -1}
                className={btnClass}
                onClick={() => onChange(tab.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
              >
                <span className="tab-label">{tab.label}</span>
                {hasBadge && (
                  <span
                    className={`tab-badge tab-badge--${tab.badgeVariant || "danger"}`}
                    aria-label={`${tab.badge} yêu cầu chờ phê duyệt`}
                  >
                    {tab.badge! > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${value}`}
        className={panelClassName}
      >
        {children}
      </div>
    </>
  );
}
