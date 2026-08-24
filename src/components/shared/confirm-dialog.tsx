"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmBg =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-primary hover:bg-ink/90 text-on-primary";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: "var(--color-overlay-scrim)" }}
      onClick={onCancel}
    >
      <div
        className="bg-canvas rounded-lg max-w-[380px] w-full mx-lg p-xxl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center mb-md">
          {variant === "danger" ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1L17 16H1L9 1Z"
                fill="#ef4444"
                stroke="#ef4444"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
              <path d="M9 6v4M9 13v1" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 9l4 4 7-7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[18px] font-[540] leading-[1.35] tracking-[-0.26px] text-ink mb-sm">
          {title}
        </h3>

        {/* Message */}
        <p className="text-[14px] font-[320] leading-[1.45] text-ink/50 mb-lg">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-[40px] rounded-pill border border-hairline text-[14px] font-[480] text-ink/60 hover:bg-surface-soft transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-[40px] rounded-pill text-[14px] font-[480] transition-colors ${confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
