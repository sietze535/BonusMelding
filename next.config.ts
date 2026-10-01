import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.ah.nl" },
      { protocol: "https", hostname: "www.ah.nl" },
    ],
  },
};

export default nextConfig;
