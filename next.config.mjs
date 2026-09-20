/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // 客户端路由缓存：访问过 / 预取过的页面 5 分钟内切回不再请求服务器；
    // 回到前台时由 RefreshOnFocus 主动刷新，保证不会一直看旧数据
    staleTimes: { dynamic: 300, static: 300 },
  },
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Leaflet fixes for server-side build
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
