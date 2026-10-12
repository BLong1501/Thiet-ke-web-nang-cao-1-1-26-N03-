import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
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

  return (
    <>
      <div className="tabs" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const selected = tab.id === value;
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
              className={selected ? "active" : ""}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              {tab.label}
            </button>
          );
        })}
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
