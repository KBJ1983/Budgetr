/**
 * Version of the screenshots and films in public/landing/, public/skole/ and public/video/. Their file names stay the
 * same when they are remade (`pnpm shots`, `pnpm shots:skole`, `pnpm video`), so browsers and the image optimizer would
 * keep showing the old ones; the pages add `?v=<MEDIA_V>` to their URLs. Raise it after remaking them.
 * next.config.ts allows exactly this query on those paths (images.localPatterns).
 */
export const MEDIA_V = "8";

/** A public path with the media version appended. */
export const media = (path: string) => `${path}?v=${MEDIA_V}`;
