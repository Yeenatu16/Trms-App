import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.8', '192.168.1.4', '192.168.1.7', '127.0.0.1', 'localhost'],
};

export default nextConfig;

