/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

// React is used to create the functional component and manage hooks such as
// `useRef` and `useCallback`.
import type { JSX } from "react";
import React, { useCallback, useRef } from "react";
// React Native primitives for styling and typed view properties.
import { StyleSheet, type ViewStyle } from "react-native";
// WebView allows native platforms to render HTML content. This is required to
// load Shaka Player which is distributed as an ES module for browsers.
import { WebView } from "react-native-webview";

export interface ShakaVideoProps {
  readonly uri: string;
}

// Pre-bundled HTML file that bootstraps Shaka Player. This asset is processed
// by Metro so it can be loaded via the `source` prop of the WebView.
const PLAYER_HTML: number = require("@/assets/html/player.html");

export default function ShakaVideo({ uri }: ShakaVideoProps): JSX.Element {
  // Hold a reference to the underlying WebView instance so that we can inject
  // JavaScript once the page has loaded.
  const webviewRef: React.RefObject<WebView | null> = useRef<WebView | null>(
    null,
  );

  const handleLoadEnd = useCallback((): void => {
    // Once the HTML document loads, call the global initialization function.
    // The trailing "true" ensures the injected script returns a valid value,
    // which is required by the WebView API.
    webviewRef.current?.injectJavaScript(
      `window.initializePlayer(${JSON.stringify(uri)}); true;`,
    );
  }, [uri]);

  return (
    <WebView
      ref={webviewRef}
      // Load the bundled HTML page that imports Shaka Player. The page exposes
      // a global `initializePlayer()` function which is invoked above.
      source={PLAYER_HTML}
      style={styles.video as ViewStyle}
      onLoadEnd={handleLoadEnd}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
    />
  );
}

interface Styles {
  readonly video: ViewStyle;
}

const styles: StyleSheet.NamedStyles<Styles> = StyleSheet.create<Styles>({
  video: {
    // Position the video absolutely so that it layers above any placeholders.
    // This mirrors the behavior of the web `<video>` element used on browsers.
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
});
