/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL
      ? process.env.INTERNAL_API_URL.replace(/\/api$/, "")
      : (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000");
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig;