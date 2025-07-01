/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";
import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

/** Path to the bundled web build used inside the WebView. */
const BUNDLED_HTML_PATH: number = require("../webview/index.html");

export default function BundledWebView(): JSX.Element {
  return (
    <WebView
      originWhitelist={["*"]}
      source={BUNDLED_HTML_PATH}
      style={styles.webview as ViewStyle}
      allowsFullscreenVideo
    />
  );
}

interface Styles {
  readonly webview: ViewStyle;
}

const styles: StyleSheet.NamedStyles<Styles> = StyleSheet.create<Styles>({
  webview: {
    flex: 1,
  },
});
