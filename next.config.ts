import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_CONFIG_HOSTNAME ||'' ,
        port: '',
        pathname: '/storage/v1/**',
      },
    ],
  },
}

export default nextConfig
