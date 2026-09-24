"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { num } from "@/lib/domain/format";
import { parseAmount } from "@/lib/domain/importer";

export function Dialog({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`bx-dialog${wide ? " is-wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="bx-dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="bx-x" aria-label="Luk" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="bx-dialog-body">{children}</div>
      {footer ? <div className="bx-dialog-foot">{footer}</div> : null}
    </dialog>
  );
}

export function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="bx-field">
      <span>{label}</span>
      {children}
      {help ? <p className="bx-help">{help}</p> : null}
    </label>
  );
}

/** Text input for kroner that accepts "1.234,50" and "1234.5". */
export function MoneyInput({
  value,
  onChange,
  id,
  placeholder = "0",
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value ? num(value) : "");
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value ? num(value) : "");
  }, [value, focused]);
  return (
    <input
      id={id}
      className="bx-input num"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseAmount(e.target.value.replace(/−/g, "-"));
        onChange(Number.isNaN(n) ? 0 : Math.abs(n));
      }}
    />
  );
}

export function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "hi" | "pos" | "neg";
}) {
  return (
    <div className={`bx-tile${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
      <span>{sub ?? " "}</span>
    </div>
  );
}

export function Menu({ label, children, primary }: { label: string; children: ReactNode; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="bx-menu" ref={ref}>
      <button
        type="button"
        className={`bx-btn${primary ? " bx-btn-primary" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label} ▾
      </button>
      {open ? (
        <div className="bx-menu-list" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="bx-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
