import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GatherUp",
    short_name: "GatherUp",
    description: "Play. Laugh. Connect.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07111f",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: "/og-impostor-invite.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
