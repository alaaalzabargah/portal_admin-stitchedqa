import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    // Pin turbopack root to this directory so it doesn't inherit parent middleware
    turbopack: {
        root: path.resolve(__dirname),
    },
    // Allow Shopify CDN images for next/image
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.shopify.com',
            },
        ],
    },
};

export default nextConfig;
