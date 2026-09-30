import type { MetadataRoute } from "next";

// The site is not launched yet: keep every crawler out until ALLOW_INDEXING=1 is set.
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING === "1") {
    return { rules: { userAgent: "*", allow: "/" } };
  }
  return { rules: { userAgent: "*", disallow: "/" } };
}
