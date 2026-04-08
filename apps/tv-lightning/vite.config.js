/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  blitsFileConverter,
  injectDevConfig,
  preCompiler,
  reactivityGuard,
} from "@lightningjs/blits/vite";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const require = createRequire(import.meta.url);
const lightningSettingsEntry =
  require.resolve("@lightningjs/sdk/src/Settings/index.js");
const metrologicalSdkEntry = require.resolve("@metrological/sdk/index.js");
const coreEntry = fileURLToPath(
  new URL("../../packages/core/src/index.ts", import.meta.url),
);
const coreBrandWebEntry = fileURLToPath(
  new URL("../../packages/core/src/brand/web.ts", import.meta.url),
);
const sharedBrandIconEntry = fileURLToPath(
  new URL("../../packages/core/src/brand/icon-1500x1500.png", import.meta.url),
);
const playerCoreEntry = fileURLToPath(
  new URL("../../packages/player-core/src/index.ts", import.meta.url),
);
const sharedBrandIconPublicPath = "/assets/icon-1500x1500.png";

/**
 * @brief Serves and emits the shared brand icon at the TV app's existing public URL
 *
 * The TV app keeps its stable `/assets/icon-1500x1500.png` path for HTML and
 * manifest metadata, while the bytes come from the canonical asset in
 * `packages/core`.
 *
 * @returns {import("vite").Plugin} Vite plugin that maps the public icon path
 */
function createSharedBrandIconPlugin() {
  return {
    name: "shared-brand-icon",

    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split("?")[0];

        if (requestPath !== sharedBrandIconPublicPath) {
          next();
          return;
        }

        response.setHeader("Content-Type", "image/png");
        response.setHeader("Cache-Control", "no-cache");
        response.end(readFileSync(sharedBrandIconEntry));
      });
    },

    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: sharedBrandIconPublicPath.slice(1),
        source: readFileSync(sharedBrandIconEntry),
      });
    },
  };
}

// Vite configuration for the LightningJS-based application. The configuration
// is intentionally simple and primarily enables the Blits plugin along with the
// cross-origin headers required for certain browser APIs.

export default defineConfig({
  // Base path for all assets in production. Change this to "/myApp/" if the
  // site is deployed under a subdirectory.
  base: "/",

  // Use the Blits Vite plugins needed by this app. The default plugin bundle
  // also includes MSDF font generation, which this project does not use.
  plugins: [
    injectDevConfig(),
    blitsFileConverter(),
    reactivityGuard(),
    preCompiler(),
    createSharedBrandIconPlugin(),
  ],

  server: {
    headers: {
      // Required to enable SharedArrayBuffer and other security-sensitive
      // browser features. Both headers are needed for proper isolation.
      "Cross-Origin-Opener-Policy": "same-origin",
      // Use `credentialless` so the demo video can be fetched without CORS
      // or Cross-Origin-Resource-Policy headers.
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },

  // Ensure internal Lightning modules can be bundled by the dev server
  resolve: {
    alias: {
      "@meditation-surf/core/brand/web": coreBrandWebEntry,
      "@meditation-surf/core": coreEntry,
      "@meditation-surf/player-core": playerCoreEntry,
      "@lightningjs/sdk/src/Settings": lightningSettingsEntry,
      "@metrological/sdk": metrologicalSdkEntry,
    },
  },

  optimizeDeps: {
    include: ["@lightningjs/sdk/src/Settings", "@metrological/sdk"],
  },
});
