/**
 * Renders a film from video/ (erhverv, privat, skole, kom-i-gang) to an MP4, frame by frame: the page exposes window.seek(t), so
 * every frame is exact no matter how fast the machine is. Needs ffmpeg on PATH (or FFMPEG=<path>) and Chrome.
 *
 *   pnpm video erhverv                         → public/video/budgetpro-erhverv.mp4
 *   pnpm video privat --still=12.5 out.png     → one PNG of second 12.5 instead (for checking a frame)
 *   pnpm video skole --reel                    → public/video/budgetpro-skole-reel.mp4, 1080×1920 (9:16) for phones
 *                                                and reels
 *
 * Each film gets its own calm background tune from scripts/music.mjs (made by us, so free to use), as long as the film.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { writeMusic } from "./music.mjs";

const FPS = 30;
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

const tmp = mkdtempSync(join(tmpdir(), "budgetpro-film-"));
const music = join(tmp, "music.wav");
writeMusic(music, name, duration);

const ffmpeg = spawn(
  process.env.FFMPEG ?? "ffmpeg",
  ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", music,
   "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
   "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out],
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
rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${out}`);
