import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./taskforge.db"],
  },
};

export default nextConfig;
