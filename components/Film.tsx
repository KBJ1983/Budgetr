import s from "./Film.module.css";

export type FilmName = "privat" | "erhverv" | "skole";

/**
 * A short explainer film (front page, Erhverv, Skole). The MP4 and its poster live in public/video/ and are made from
 * video/<name>.html with `pnpm video <name>`; the poster is a frame from the intro. Text only, no sound, so it is
 * muted and only loads when someone presses play.
 */
export function Film({ name, label }: { name: FilmName; label: string }) {
  return (
    <figure className={s.frame} data-reveal="tilt">
      <video
        className={s.video}
        src={`/video/budgetpro-${name}.mp4`}
        poster={`/video/budgetpro-${name}.jpg`}
        aria-label={label}
        controls
        muted
        playsInline
        preload="none"
      />
    </figure>
  );
}
