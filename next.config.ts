import type { NextConfig } from "next";
import { MEDIA_V } from "./lib/media-version";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Screenshots carry ?v=<MEDIA_V> (lib/media-version.ts) so a remade shot is never served from a cache; every other
  // local image must come without a query.
  images: {
    localPatterns: [
      { pathname: "/landing/**", search: `?v=${MEDIA_V}` },
      { pathname: "/skole/**", search: `?v=${MEDIA_V}` },
      { pathname: "/**", search: "" },
    ],
  },
  // The budget app is the original single-file app (public/budgetr-app/index.html), served at /app.
  async rewrites() {
    return [{ source: "/app", destination: "/budgetr-app/index.html" }];
  },
  // Not launched yet: tell search engines not to index anything (pages, the app, images)
  // until ALLOW_INDEXING=1 is set. robots.txt (app/robots.ts) follows the same switch.
  async headers() {
    if (process.env.ALLOW_INDEXING === "1") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
