import s from "./Film.module.css";

export type FilmName = "privat" | "erhverv" | "skole";

/**
 * A short explainer film (front page, Erhverv, Skole). The MP4s and their posters live in public/video/ and are made
 * from video/<name>.html with `pnpm video <name>` (16:9) and `pnpm video <name> --reel` (9:16, budgetpro-<name>-reel);
 * the poster is a frame from the intro. Phones get the upright reel, wider screens the 16:9 film – CSS shows one of
 * the two, and as neither preloads, only the one that is played is fetched. Text and a background track (Mixkit,
 * see scripts/video.mjs), so the sound is on once the visitor presses play.
 */
export function Film({ name, label }: { name: FilmName; label: string }) {
  return (
    <figure className={s.frame} data-reveal="tilt">
      <video
        className={`${s.video} ${s.wide}`}
        src={`/video/budgetpro-${name}.mp4`}
        poster={`/video/budgetpro-${name}.jpg`}
        aria-label={label}
        controls
        playsInline
        preload="none"
      />
      <video
        className={`${s.video} ${s.reel}`}
        src={`/video/budgetpro-${name}-reel.mp4`}
        poster={`/video/budgetpro-${name}-reel.jpg`}
        aria-label={label}
        controls
        playsInline
        preload="none"
      />
    </figure>
  );
}
