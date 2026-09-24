import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.LSMS_BUILD_DIR ?? ".next",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,
  transpilePackages: ["@lsms/shared"],
  async rewrites() {
    const origin = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");
    return [
      { source: "/api/v1/:path*/", destination: `${origin}/api/v1/:path*/` },
      { source: "/api/auth/:path*", destination: `${origin}/api/auth/:path*` },
    ];
  },
};

export default nextConfig;
