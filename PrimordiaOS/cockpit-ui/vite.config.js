import { defineConfig } from "vite";

export default defineConfig({
  root: "./",
  server: {
    port: 5055,
    open: true
  },
  build: {
    outDir: "dist"
  }
});
