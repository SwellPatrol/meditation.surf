/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";
import React from "react";
import { Platform } from "react-native";

import Native from "./BundledWebView.native";

/**
 * Cross-platform wrapper that renders the bundled WebView on native
 * platforms and returns null on the web.
 */
export default function BundledWebView(): JSX.Element | null {
  if (Platform.OS === "web") {
    return null;
  }
  return <Native />;
}
