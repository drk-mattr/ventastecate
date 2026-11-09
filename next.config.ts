import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/register",
        destination: "/signup",
        permanent: true,
      },
      {
        source: "/terminos",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/privacidad",
        destination: "/privacy",
        permanent: true,
      },
    ];
  },
  /* config options here */
  experimental: {
    reactCompiler: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'afhcrjuezhjsfzampbsz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
