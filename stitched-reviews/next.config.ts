import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
