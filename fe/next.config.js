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
  async redirects() {
    return [
      {
        source: "/",
        destination: "/kasir",
        permanent: false,
      },
      {
        source: "/antrian",
        destination: "/kasir",
        permanent: false,
      },
      {
        source: "/pesanan/:path*",
        destination: "/kasir",
        permanent: false,
      },
      {
        source: "/menu/:path*",
        destination: "/admin/menu",
        permanent: false,
      },
      {
        source: "/admin/pos",
        destination: "/kasir",
        permanent: false,
      },
      {
        source: "/admin/laporan",
        destination: "/admin/expenses",
        permanent: false,
      },
      {
        source: "/admin/promo",
        destination: "/admin/menu",
        permanent: false,
      },
      {
        source: "/admin/inventory",
        destination: "/admin/menu",
        permanent: false,
      },
      {
        source: "/admin/recipes",
        destination: "/admin/menu",
        permanent: false,
      },
      {
        source: "/login_admin",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/login/pos",
        destination: "/kasir/login",
        permanent: false,
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