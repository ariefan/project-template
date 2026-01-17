import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const git = (command) => {
  try {
    return execSync(command).toString().trim();
  } catch {
    return null;
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/notifications"],
  env: {
    APP_VERSION: pkg.version,
    BUILD_COMMIT: git("git rev-parse --short HEAD"),
    BUILD_TIME: git("git log -1 --format=%cI"),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
