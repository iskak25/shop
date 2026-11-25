import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // явный алиас: tsconfig-paths не срабатывает на путях с кириллицей в Windows
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(process.cwd(), "src");
    return config;
  },
};
export default nextConfig;
