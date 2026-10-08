import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import s from "./skole.module.css";

/** The school page: header with the wordmark and the "Skole" pill, the content, and a quiet footer. */
export function Shell({ right, toast, children }: { right?: React.ReactNode; toast?: string | null; children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/skole" className={s.brand}>
          <Wordmark fontSize={24} />
          <span className={s.pill}>Skole</span>
        </Link>
        {right}
      </header>
      <main className={s.main}>{children}</main>
      <footer className={s.footer}>
        <span>Eksempeltal</span>
        <span>Ingen navne gemmes</span>
      </footer>
      {toast && (
        <div className={s.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
