import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Menu thả xuống dạng disclosure (nút + vùng nội dung), không dùng role="menu"
 * vì nội dung là các liên kết điều hướng thông thường.
 * Đóng khi: nhấn Escape (trả focus về nút), bấm ra ngoài, hoặc chọn một liên kết.
 */
export function Dropdown({
  trigger,
  label,
  className = "",
  triggerClassName,
  onOpen,
  children,
}: {
  trigger: ReactNode;
  /** Tên truy cập của nút mở menu. */
  label: string;
  className?: string;
  triggerClassName?: string;
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`dropdown ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
      >
        {trigger}
      </button>
      <div
        id={panelId}
        className="dropdown-panel"
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {children}
      </div>
    </div>
  );
}
