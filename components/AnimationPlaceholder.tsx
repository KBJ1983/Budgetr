import { ArrowRightIcon } from "@/components/landing/icons";
import s from "./AnimationPlaceholder.module.css";

/**
 * A dark frame that holds the place of a short explainer animation (front page, Erhverv, Skole) until it is made.
 * Swap the inside for the video when it comes; the frame keeps its size, so the page does not move.
 */
export function AnimationPlaceholder({ label }: { label: string }) {
  return (
    <figure className={s.frame} data-reveal>
      <span className={s.play} aria-hidden="true">
        <ArrowRightIcon size={26} strokeWidth={2} />
      </span>
      <figcaption className={s.caption}>{label}</figcaption>
    </figure>
  );
}
