/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite configuration for the React-based application. The configuration is
// intentionally simple and primarily enables the React plugin along with the
// cross-origin headers required for certain browser APIs.

export default defineConfig({
  // Base path for all assets in production. Change this to "/myApp/" if the
  // site is deployed under a subdirectory.
  base: "/",

  // Use the React plugin to add React support during build and dev
  plugins: [react()],

  server: {
    headers: {
      // Required to enable SharedArrayBuffer and other security-sensitive
      // browser features. Both headers are needed for proper isolation.
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
