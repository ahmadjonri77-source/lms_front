import type { NextConfig } from "next";

/* API_ORIGIN env o'zgaruvchisi berilsa o'sha ishlatiladi (masalan lokal
   backend uchun .env.local'da), berilmasa deploy qilingan backend. */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://3.126.43.130:4000";

const nextConfig: NextConfig = {
  experimental: {
    /* rewrite proxy so'rov tanasini xotiraga buferlaydi, standart chegara 10MB.
       Kurs/dars videolari undan katta bo'lgani uchun chegarani ko'taramiz. */
    proxyClientMaxBodySize: "100mb",
  },

  async rewrites() {
    return [
      // backend'ning barcha endpoint'lari (auth, users, ...)
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
      // yuklangan rasmlar: backend ularni global prefix'siz beradi
      {
        source: "/uploads/:path*",
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
