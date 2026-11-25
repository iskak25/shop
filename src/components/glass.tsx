"use client";

import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type ElementType, type InputHTMLAttributes, type ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

interface PanelProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  [k: string]: unknown;
}

export function GlassPanel({ variant, as: Tag = "div", className = "", children, ...rest }: PanelProps & { variant: "dark" | "light" }) {
  return (
    <Tag className={`glass-${variant} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
export const DarkGlassPanel = (p: PanelProps) => <GlassPanel variant="dark" {...p} />;
export const LightGlassPanel = (p: PanelProps) => <GlassPanel variant="light" {...p} />;

/** Плавное появление блоков (fade + slide up). */
export function Reveal({ children, delay = 0, className, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function GlassButton({
  variant = "primary",
  block,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "glass"; block?: boolean }) {
  return <button className={`btn btn--${variant} ${block ? "btn--block" : ""} ${className}`} {...rest} />;
}

export function IconButton({
  label,
  tone = "default",
  active,
  className = "",
  children,
  badge,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "default" | "light" | "solid"; active?: boolean; badge?: number }) {
  const t = tone === "light" ? "icon-btn--light" : tone === "solid" ? "icon-btn--solid" : "";
  return (
    <button aria-label={label} title={label} className={`icon-btn ${t} ${active ? "is-active" : ""} ${className}`} {...rest}>
      {children}
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  );
}

export function GlassInput({ label, error, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      {error && (
        <span id={`${id}-err`} className="field__err" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button, a[href], input")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

export function GlassDrawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useDialog(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="drawer glass-dark"
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.98 }}
            transition={{ duration: 0.36, ease }}
          >
            <div className="drawer__head">
              <h2 className="display h3">{title}</h2>
              <IconButton label="Закрыть" onClick={onClose}>
                <X size={20} strokeWidth={1.75} />
              </IconButton>
            </div>
            <div className="drawer__body">{children}</div>
            {footer && <div className="drawer__foot">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function GlassModal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useDialog(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
          <div className="modal" onClick={onClose}>
            <motion.div
              ref={ref}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="modal__panel glass-light"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.36, ease }}
            >
              <IconButton label="Закрыть" tone="light" className="modal__close" onClick={onClose}>
                <X size={20} strokeWidth={1.75} />
              </IconButton>
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ProductSkeleton() {
  return (
    <div className="card glass-light" aria-hidden>
      <div className="skeleton" style={{ aspectRatio: "1", borderRadius: 0 }} />
      <div className="card__body">
        <div className="skeleton" style={{ height: 12, width: "40%" }} />
        <div className="skeleton" style={{ height: 18, width: "80%" }} />
        <div className="skeleton" style={{ height: 22, width: "50%", marginTop: 10 }} />
      </div>
    </div>
  );
}
