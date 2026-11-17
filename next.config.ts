import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The map used to live at "/"; old shared links with filters still work.
  async redirects() {
    return ["categoria", "orgao"].map((key) => ({
      source: "/",
      has: [{ type: "query" as const, key }],
      destination: "/mapa",
      permanent: false,
    }));
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
