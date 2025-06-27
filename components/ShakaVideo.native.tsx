/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";
import React, { useCallback, useRef } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({ uri }: ShakaVideoProps): JSX.Element {
  const webviewRef: React.RefObject<WebView | null> = useRef<WebView | null>(
    null,
  );

  const handleLoadEnd = useCallback((): void => {
    webviewRef.current?.injectJavaScript(
      `window.initializePlayer(${JSON.stringify(uri)}); true;`,
    );
  }, [uri]);

  return (
    <WebView
      ref={webviewRef}
      source={require("@/assets/html/player.html")}
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
    // Position the video absolutely so that it layers above any placeholders,
    // mirroring the behavior of the web <video> element.
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
});
