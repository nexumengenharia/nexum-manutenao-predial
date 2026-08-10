/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg", "bcryptjs"],
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
// v2
