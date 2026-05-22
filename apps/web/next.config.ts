import type { NextConfig } from "next";
import path from "path";
import os from "os";
import dotenv from "dotenv";

// Load repo root .env file from apps/web.
dotenv.config({ path: path.join(process.cwd(), "..", "..", ".env") });

function devOrigins(): string[] {
  const hosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const info of interfaces ?? []) {
      if (info.family === "IPv4" && !info.internal) {
        hosts.add(info.address);
      }
    }
  }

  return [...hosts];
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: devOrigins(),
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/api/v1/:path*`,
      },
      {
        source: "/auth/accounts/:path*",
        destination: `${process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_AUTH_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/accounts/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_AUTH_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
