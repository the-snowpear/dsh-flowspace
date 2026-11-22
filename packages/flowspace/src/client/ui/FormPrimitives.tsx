import { useEffect, useState, type ReactNode } from "react";

export function InlineError({
  message,
  className = "fs-human-error",
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <small role="alert" className={className}>
      {message}
    </small>
  );
}

export function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className ? `fs-field ${className}` : "fs-field"}>
      <span className="field-label">
        {label}
        {required && <i aria-hidden="true"> *</i>}
      </span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

/** Two-step inline confirmation button with automatic disarm timeout. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  className = "button",
  confirmClassName = "button button-danger",
  timeoutMs = 3200,
  children,
}: {
  label: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  confirmClassName?: string;
  timeoutMs?: number;
  children?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), timeoutMs);
    return () => clearTimeout(timer);
  }, [armed, timeoutMs]);

  return (
    <button
      type="button"
      disabled={disabled}
      className={armed ? confirmClassName : className}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        void onConfirm();
      }}
    >
      {children}
      <span>{armed ? confirmLabel : label}</span>
    </button>
  );
}
