import styles from "./landing.module.css";
import { CheckIcon } from "./icons";

export function CheckList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={[styles.checkList, className].filter(Boolean).join(" ")}>
      {items.map((item) => (
        <li key={item}>
          <span className={styles.checkDot}>
            <CheckIcon size={14} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
