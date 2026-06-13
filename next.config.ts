import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* config options here */
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Desactivado en desarrollo para evitar caché agresiva mientras se codea.
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
