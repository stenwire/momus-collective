import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "momus collective",
    short_name: "momus",
    description: "Shirts with something to say.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/avatar-192.png", sizes: "192x192", type: "image/png" },
      { src: "/avatar-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
