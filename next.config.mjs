/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/equipment/:code',
        destination: '/asset/:code',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
