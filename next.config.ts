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
  // Security headers on every response: no other site may show ours in a frame (clickjacking on /app, /admin,
  // /aftale), no type sniffing, no full URLs (codes in links) sent to other sites, no camera/mic/location. Not
  // launched yet: also tell search engines not to index anything until ALLOW_INDEXING=1 is set (app/robots.ts
  // follows the same switch).
  async headers() {
    const security = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    const noIndex = process.env.ALLOW_INDEXING === "1" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [{ source: "/:path*", headers: [...security, ...noIndex] }];
  },
};

export default nextConfig;
