/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import React from "react";
import { JSX } from "react/jsx-runtime";
import {
  Image,
  type ImageStyle,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import ShakaVideo from "@/components/ShakaVideo";

export default function HomeScreen(): JSX.Element {
  return (
    <View style={styles.container as ViewStyle}>
      <Image
        source={require("@/assets/images/icon-1500x1500.png")}
        resizeMode="contain"
        style={styles.icon as ImageStyle}
      />
      <ShakaVideo uri="https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8" />
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
    // Ensure the container always fills the viewport, even when browser
    // UI elements like the address bar dynamically show or hide.
    // Use `dvh` units so the value adjusts with viewport changes.
    minHeight: "100dvh",
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
