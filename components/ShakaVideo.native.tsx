/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { Asset } from "expo-asset";
import type { JSX } from "react";
import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({ uri }: ShakaVideoProps): JSX.Element {
  const assetUri: string = Asset.fromModule(
    require("../assets/html/player.html"),
  ).uri;
  const sourceUri: string = `${assetUri}?uri=${encodeURIComponent(uri)}`;
  return (
    <WebView
      style={styles.webview as ViewStyle}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      originWhitelist={["*"]}
      source={{ uri: sourceUri }}
    />
  );
}

interface Styles {
  readonly webview: ViewStyle;
}

const styles: StyleSheet.NamedStyles<Styles> = StyleSheet.create<Styles>({
  webview: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
});
