import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-slider'],
  },
};

export default nextConfig;
