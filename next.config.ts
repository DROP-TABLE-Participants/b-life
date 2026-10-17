import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Orders and shipments were merged into a single transfers page.
  async redirects() {
    return [
      { source: "/hospital/:hospitalId/:section(orders|shipments)", destination: "/hospital/:hospitalId/transfers", permanent: false },
      { source: "/control-tower/:section(orders|shipments)", destination: "/control-tower/transfers", permanent: false },
    ];
  },
};

export default nextConfig;
