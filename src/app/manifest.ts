import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoDM",
    short_name: "AutoDM",
    description: "Personal Instagram auto-DM dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d10",
    theme_color: "#d62976",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
