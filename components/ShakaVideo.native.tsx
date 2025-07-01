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

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({
  uri: _uri,
}: ShakaVideoProps): JSX.Element {
  // The native implementation reuses the web build via a WebView so that
  // Shaka Player can be used consistently across platforms. The bundled
  // HTML does not currently accept the URI, so the prop is ignored.
  void _uri;
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
    // Position the WebView absolutely so that it layers above any placeholders,
    // mirroring the behavior of the web <video> element.
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
});
