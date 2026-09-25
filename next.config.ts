import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The budget app is the original single-file app (public/budgetr-app/index.html), served at /app.
  async rewrites() {
    return [{ source: "/app", destination: "/budgetr-app/index.html" }];
  },
};

export default nextConfig;
