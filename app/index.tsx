/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { VideoPlayer } from "expo-video";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { JSX } from "react/jsx-runtime";
import {
  type GestureResponderEvent,
  Image,
  type ImageStyle,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import ShakaVideo from "@/components/ShakaVideo";

export default function HomeScreen(): JSX.Element {
  // Create a video player for the native <VideoView> component.
  const player: VideoPlayer = useVideoPlayer(
    "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8",
    (instance: VideoPlayer): void => {
      instance.loop = true;
      instance.muted = true;
      void instance.play();
    },
  );
  const handleTouchStart = (event: GestureResponderEvent): void => {
    event.preventDefault();
    void player.play();
  };

  return (
    <View style={styles.container as ViewStyle} onTouchStart={handleTouchStart}>
      <Image
        source={require("@/assets/images/icon.png")}
        resizeMode="contain"
        style={styles.icon as ImageStyle}
      />
      {Platform.OS === "web" ? (
        <ShakaVideo uri="https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8" />
      ) : (
        <VideoView
          style={styles.video as ViewStyle}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      )}
    </View>
  );
}

interface Styles {
  readonly container: ViewStyle;
  readonly icon: ImageStyle;
  readonly video: ViewStyle;
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
  video: StyleSheet.absoluteFillObject,
});
