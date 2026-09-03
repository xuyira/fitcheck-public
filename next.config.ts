import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@imgly/background-removal-node", "onnxruntime-node"],
};

export default nextConfig;
