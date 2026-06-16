import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gestionala — POS y gestión",
    short_name: "Gestionala",
    description: "POS, caja e inventario para PyMEs chilenas",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0d1b2a",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
