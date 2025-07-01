/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/* eslint-env node */
/* eslint-disable no-undef */
const { getDefaultConfig } = require("expo/metro-config");

// Load Expo's default Metro configuration.
const config = getDefaultConfig(__dirname);

// Treat `.html` files as assets so the WebView can load the bundled build.
config.resolver.assetExts.push("html");

// Metro does not fully support React's package exports yet. Explicitly map
// the JSX runtime modules so that static rendering can locate them.
config.resolver.extraNodeModules = {
  // Direct paths are used because React's package exports field does not
  // expose these files to CommonJS consumers yet.
  "react/jsx-runtime": require.resolve("./node_modules/react/jsx-runtime.js"),
  "react/jsx-dev-runtime": require.resolve(
    "./node_modules/react/jsx-dev-runtime.js",
  ),
};

module.exports = config;
