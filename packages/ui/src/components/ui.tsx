import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

/* ---------- Button ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const variantCls: Record<Variant, string> = {
  primary:
    "bg-ink text-white hover:bg-black shadow-card active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-dusk-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
  ghost: "text-ink-soft hover:text-ink hover:bg-black/[0.04] disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
  outline: "border border-line-strong text-ink hover:border-omp-600 hover:text-omp-700 bg-transparent",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className = "", ...rest },
  ref,
) {
  const sizeCls = size === "sm" ? "h-8 px-3 text-[13px] rounded-lg" : size === "icon" ? "h-9 w-9 rounded-lg" : "h-10 px-4 text-sm rounded-xl";
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-omp-500/40 ${sizeCls} ${variantCls[variant]} ${className}`}
      {...rest}
    />
  );
});

/* ---------- Badge ---------- */

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-dusk-100 text-ink-soft border-line",
    green: "bg-omp-50 text-omp-700 border-omp-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ---------- Spinner ---------- */

export function Spinner({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Toggle ---------- */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-omp-500/40 ${
        checked ? "bg-omp-600" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-3xl",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/25 p-4 backdrop-blur-[2px] sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`relative w-full ${width} rounded-2xl border border-line bg-surface shadow-pop`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="text-[15px] font-semibold">{title}</div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-dusk-100 hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Segmented ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-line-strong bg-dusk-50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`inline-flex items-center gap-1.5 rounded-[10px] font-medium transition-all duration-150 focus:outline-none ${
            size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-3 text-[13px]"
          } ${value === opt.value ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink"}`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Section heading ---------- */

export function PanelHeader({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {icon}
        {title}
      </div>
      {right}
    </div>
  );
}
