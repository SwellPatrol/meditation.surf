/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { VideoPlayer } from "expo-video";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import {
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
      void instance.play();
    },
  );

  // Request fullscreen mode on Android web after the first user interaction.
  useEffect((): void => {
    if (Platform.OS !== "web") {
      return;
    }

    // Only attempt fullscreen on Android browsers.
    const isAndroid: boolean = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      return;
    }

    const requestFullscreen: () => void = (): void => {
      const element: HTMLElement | null = document.documentElement;
      const request: (() => Promise<void>) | undefined =
        element.requestFullscreen?.bind(element);
      if (request) {
        void request().catch(() => {
          // Ignore errors from unsupported browsers or user rejection.
        });
      }
      document.removeEventListener("touchstart", requestFullscreen);
      document.removeEventListener("click", requestFullscreen);
    };

    document.addEventListener("touchstart", requestFullscreen, { once: true });
    document.addEventListener("click", requestFullscreen, { once: true });
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/icon.png")}
        resizeMode="contain"
        style={styles.icon}
      />
      {Platform.OS === "web" ? (
        <ShakaVideo uri="https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8" />
      ) : (
        <VideoView
          style={styles.video}
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
