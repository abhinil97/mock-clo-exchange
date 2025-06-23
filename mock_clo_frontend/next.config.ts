import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configure webpack to use browser-compatible versions
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
      };
      
      // Exclude Node.js specific modules
      config.externals = config.externals || [];
      config.externals.push({
        'got': 'got',
        'node-fetch': 'node-fetch',
      });
    }
    
    return config;
  },
  transpilePackages: ['@aptos-labs/ts-sdk'],
};

export default nextConfig;
