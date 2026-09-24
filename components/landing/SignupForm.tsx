"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import styles from "./landing.module.css";
import { ArrowRightIcon } from "./icons";

const ERROR_TEXT = "Skriv en gyldig e-mail, fx navn@eksempel.dk.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

type SignupFormProps = {
  /** Unique prefix for element ids (two forms live on the page). */
  idPrefix: string;
  variant?: "light" | "dark";
  centered?: boolean;
};

/** E-mail signup (HANDOFF §5). A valid address continues to the app's start guide. */
export function SignupForm({ idPrefix, variant = "light", centered = false }: SignupFormProps) {
  const router = useRouter();
  const [invalid, setInvalid] = useState(false);
  const inputId = `${idPrefix}-email`;
  const errorId = `${idPrefix}-email-error`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("email");
    if (!(input instanceof HTMLInputElement)) return;
    const value = input.value.trim();
    if (!isValidEmail(value)) {
      setInvalid(true);
      input.focus();
      return;
    }
    setInvalid(false);
    router.push(`/app/start?email=${encodeURIComponent(value)}`);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (invalid && isValidEmail(event.target.value.trim())) setInvalid(false);
  }

  const className = [styles.signup, variant === "dark" ? styles.signupDark : "", centered ? styles.signupCenter : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <form className={className} onSubmit={handleSubmit} noValidate>
      {/* Grid: label / input + button / error on wide screens; everything stacked (error under the field) on mobile. */}
      <label htmlFor={inputId} className={styles.label}>
        Din e-mail
      </label>
      <input
        id={inputId}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="navn@eksempel.dk"
        required
        className={styles.input}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={handleChange}
      />
      <p id={errorId} className={styles.error} aria-live="polite">
        {invalid ? ERROR_TEXT : ""}
      </p>
      <button type="submit" className={styles.submit}>
        Opret gratis bruger <ArrowRightIcon />
      </button>
    </form>
  );
}
