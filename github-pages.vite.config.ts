import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "github-pages"),
  base: "./",
  plugins: [react()],
  css: {
    postcss: { plugins: [] },
  },
  build: {
    outDir: path.resolve(__dirname, "docs"),
    emptyOutDir: true,
    cssMinify: false,
  },
  publicDir: path.resolve(__dirname, "public"),
});
