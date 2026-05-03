/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "cdn.cloudflare.steamstatic.com" },
      { hostname: "avatars.steamstatic.com" },
    ],
  },
};

module.exports = nextConfig;
