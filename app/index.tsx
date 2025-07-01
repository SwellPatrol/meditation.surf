/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";
import React from "react";
import {
  type DimensionValue,
  Image,
  type ImageStyle,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import appIcon from "@/assets/images/icon-1500x1500.png";
import ShakaVideo from "@/components/ShakaVideo";

// URL for the sample surfing video stream
const VIDEO_HLS_STREAM: string =
  "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8";

// Ensure the container always fills the viewport, even when browser UI
// elements like the address bar dynamically show or hide. Use `dvh` units
// so the value adjusts with viewport changes.
//
// NOTE: React Native's `DimensionValue` type does not include the new
// `dvh` unit. Cast the value explicitly so TypeScript accepts it.
const FULL_VIEWPORT_HEIGHT: string = "100dvh";

export default function HomeScreen(): JSX.Element {
  return (
    <View style={styles.container as ViewStyle}>
      <Image
        source={appIcon}
        resizeMode="contain"
        style={styles.icon as ImageStyle}
      />
      <ShakaVideo uri={VIDEO_HLS_STREAM} />
    </View>
  );
}

interface Styles {
  readonly container: ViewStyle;
  readonly icon: ImageStyle;
}

const styles: StyleSheet.NamedStyles<Styles> = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    minHeight: FULL_VIEWPORT_HEIGHT as unknown as DimensionValue,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
});
