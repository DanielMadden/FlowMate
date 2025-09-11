import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome114",
    rollupOptions: {
      // Multiple entry points: popup HTML + TS entries for content and background
      input: {
        "popup/index": resolve(__dirname, "src/popup/index.html"),
        "background/service-worker": resolve(
          __dirname,
          "src/background/service-worker.ts"
        ),
        "content/entry": resolve(__dirname, "src/content/entry.ts"),
      },
      output: {
        // Keep predictable paths for MV3 manifest references
        entryFileNames: (chunk) => {
          const name = chunk.name || "entry";
          if (name.includes("background/service-worker"))
            return "background/service-worker.js";
          if (name.includes("content/entry")) return "content/entry.js";
          // HTML entries (popup) auto-generate their own JS/CSS assets; leave default for those
          return "assets/[name].js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: (assetInfo) => {
          // Keep popup assets alongside popup if desired; otherwise default to /assets
          const name = assetInfo.name ?? "";
          if (name.endsWith(".css") && name.includes("index"))
            return "popup/[name]";
          return "assets/[name]";
        },
      },
    },
    // Optional during dev: easier to inspect
    // minify: false,
    // sourcemap: true,
  },
  // If you use React in popup, add this (assuming @vitejs/plugin-react is installed):
  // plugins: [react()],
});
