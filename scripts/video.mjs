/**
 * Renders a film from video/ (erhverv, privat, skole, kom-i-gang) to an MP4, frame by frame: the page exposes window.seek(t), so
 * every frame is exact no matter how fast the machine is. Needs ffmpeg on PATH (or FFMPEG=<path>) and Chrome.
 *
 *   pnpm video erhverv                         → public/video/budgetpro-erhverv.mp4
 *   pnpm video privat --still=12.5 out.png     → one PNG of second 12.5 instead (for checking a frame)
 *   pnpm video skole --reel                    → public/video/budgetpro-skole-reel.mp4, 1080×1920 (9:16) for phones
 *                                                and reels
 *
 * Each film gets a background track from Mixkit (MUSIC below; the Mixkit Stock Music Free License allows it in
 * commercial videos without credit, but not handing out the file on its own, so the MP3 is fetched into
 * node_modules/.cache and never committed). It fades in and out, is looped with a crossfade if the film is longer, and
 * is levelled to -18 LUFS so it stays in the background.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const FPS = 30;
/** Mixkit track id per film (https://assets.mixkit.co/music/<id>/<id>.mp3). */
const MUSIC = { privat: 621, erhverv: 621, skole: 621, "kom-i-gang": 621 };
const FILMS = ["erhverv", "privat", "skole", "kom-i-gang"];
const args = process.argv.slice(2);
const name = args.find((a) => FILMS.includes(a));
if (!name) {
  console.error(`Usage: pnpm video <${FILMS.join("|")}> [--reel] [--still=<seconds>] [out]`);
  process.exit(1);
}
const reel = args.includes("--reel");
const still = args.find((a) => a.startsWith("--still="))?.slice(8);
const outArg = args.find((a) => !a.startsWith("--") && a !== name);
const base = reel ? `${name}-reel` : name;
const out = resolve(outArg ?? (still ? `${base}-${still}.png` : `public/video/budgetpro-${base}.mp4`));
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const viewport = reel ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
await page.goto(`${pathToFileURL(resolve(`video/${name}.html`)).href}?render${reel ? "&reel" : ""}`, { waitUntil: "networkidle" });
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.DURATION);

if (still) {
  await page.evaluate((t) => window.seek(t), Number(still));
  await page.screenshot({ path: out });
  await browser.close();
  console.log(`Wrote ${out}`);
  process.exit(0);
}

// The track: fetched once into the cache, crossfaded onto itself when the film is longer than it
const FF = process.env.FFMPEG ?? "ffmpeg";
const id = MUSIC[name];
const track = resolve(`node_modules/.cache/budgetpro-music/${id}.mp3`);
if (!existsSync(track)) {
  mkdirSync(dirname(track), { recursive: true });
  const res = await fetch(`https://assets.mixkit.co/music/${id}/${id}.mp3`);
  if (!res.ok) throw new Error(`Could not fetch Mixkit track ${id}: ${res.status}`);
  writeFileSync(track, Buffer.from(await res.arrayBuffer()));
}
const trackLen = Number(execFileSync(FF.replace(/ffmpeg(\.exe)?$/, "ffprobe$1"), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", track]).toString());
const loop = trackLen < duration + 0.5;
const fade = `afade=t=in:d=1,afade=t=out:st=${(duration - 3.5).toFixed(2)}:d=3.5,loudnorm=I=-18:TP=-2:LRA=11`;
const audio = loop
  ? ["-i", track, "-i", track, "-filter_complex", `[1:a][2:a]acrossfade=d=5:c1=tri:c2=tri,atrim=0:${duration},${fade}[a]`]
  : ["-i", track, "-filter_complex", `[1:a]atrim=0:${duration},${fade}[a]`];

const ffmpeg = spawn(
  FF,
  ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...audio, "-map", "0:v", "-map", "[a]",
   "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
   "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const done = new Promise((ok, fail) => ffmpeg.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`)))));

const frames = Math.round(duration * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.seek(t), i / FPS);
  const png = await page.screenshot({ type: "png" });
  if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  if (i % (FPS * 5) === 0) console.log(`${name}: ${i / FPS}/${duration} s`);
}
ffmpeg.stdin.end();
await done;
await browser.close();
console.log(`Wrote ${out}`);
