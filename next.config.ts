import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Lets phones on the same Wi-Fi open the dev server (needed for the guide QR codes).
const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanIps,
};

export default nextConfig;
