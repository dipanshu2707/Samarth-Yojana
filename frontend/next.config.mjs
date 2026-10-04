const backend = process.env.API_PROXY_TARGET || (
  process.env.NODE_ENV === 'production'
    ? 'https://yojana-sathi-api-orro.onrender.com'
    : 'http://127.0.0.1:8000'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/health', destination: `${backend}/health` },
      { source: '/health/:path*', destination: `${backend}/health/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;