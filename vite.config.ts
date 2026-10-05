import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["images/*.svg", "images/*.webp", "icons/*.png"],
      manifestFilename: "manifest.webmanifest",
      manifest: {
        name: "À Table ! — Repas en famille",
        short_name: "À Table !",
        lang: "fr",
        description: "Votre semaine de repas et vos courses, en famille.",
        theme_color: "#354d3e",
        background_color: "#faf8f2",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,webmanifest}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  // Keep the browser host so the API can validate same-origin writes in development.
  server: { proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: false } } },
  build: { target: "es2022" },
});
