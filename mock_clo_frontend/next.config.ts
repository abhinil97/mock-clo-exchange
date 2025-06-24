import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configure webpack fallbacks for browser compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
        process: false,
        util: false,
      };
      
      // Exclude problematic Node.js modules
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('got', 'node-fetch');
      }
    }
    
    return config;
  },
  transpilePackages: ['@aptos-labs/ts-sdk'],
};

export default nextConfig;
