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

module.exports = config;
