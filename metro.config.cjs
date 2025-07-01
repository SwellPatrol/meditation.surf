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

// Ensure that React's new JSX runtime can be resolved correctly in Metro.
// Metro doesn't fully support the `exports` field used by React yet. Explicit
// paths guarantee that modules like `react/jsx-runtime` resolve without errors
// during static rendering.
config.resolver.extraNodeModules = {
  "react/jsx-runtime": require.resolve("react/jsx-runtime"),
  "react/jsx-dev-runtime": require.resolve("react/jsx-dev-runtime"),
};

// Enable Node's "exports" field handling for packages that support it. This is
// marked unstable in Metro but required for modern modules that rely on
// subpath exports.
config.resolver.unstable_enablePackageExportsResolution = true;

module.exports = config;
