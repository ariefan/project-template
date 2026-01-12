/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/notifications",
    "@workspace/feature-files",
  ],
};

export default nextConfig;
