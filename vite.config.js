/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import blitsVitePlugins from "@lightningjs/blits/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/", // Set to your base path if you are deploying to a subdirectory (example: /myApp/)
  plugins: [...blitsVitePlugins],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
