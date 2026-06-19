import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  assetPrefix: basePath || undefined,
  basePath: basePath || undefined,
  output: "export",
  reactStrictMode: true,
  trailingSlash: true
};

export default nextConfig;
