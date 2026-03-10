import type { NextConfig } from "next";

const apiOrigin =
  process.env.API_ORIGIN ?? "https://api.project.cims.cognilabs.org";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "uncanonical-chantelle-winningly.ngrok-free.dev",
  ],

  eslint: {
    ignoreDuringBuilds: true,
  },

  basePath: "",

  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
