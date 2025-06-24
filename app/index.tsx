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

  // Toggle fullscreen mode whenever the user interacts with the page on web.
  useEffect((): void => {
    if (Platform.OS !== "web") {
      return;
    }

    const toggleFullscreen: () => void = (): void => {
      const element: HTMLElement | null = document.documentElement;
      const request: (() => Promise<void>) | undefined =
        element.requestFullscreen?.bind(element);
      const exit: (() => Promise<void>) | undefined =
        document.exitFullscreen?.bind(document);

      if (document.fullscreenElement) {
        if (exit) {
          void exit().catch(() => {
            // Ignore errors from unsupported browsers or user rejection.
          });
        }
      } else if (request) {
        void request().catch(() => {
          // Ignore errors from unsupported browsers or user rejection.
        });
      }
    };

    document.addEventListener("touchstart", toggleFullscreen);
    document.addEventListener("click", toggleFullscreen);

    return (): void => {
      document.removeEventListener("touchstart", toggleFullscreen);
      document.removeEventListener("click", toggleFullscreen);
    };
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
