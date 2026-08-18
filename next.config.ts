import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 dev currently rejects some non-ASCII catch-all params when
  // `output: "export"` is active, even though the same 1,291 params build
  // correctly. Keep static export for production while letting local dev
  // resolve and display every generated region route.
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
