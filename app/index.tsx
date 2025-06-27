/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { VideoPlayer } from "expo-video";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useRef } from "react";
import { JSX } from "react/jsx-runtime";
import {
  Image,
  type ImageStyle,
  Platform,
  Pressable,
  StyleSheet,
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
  const videoRef: React.RefObject<HTMLVideoElement | null> =
    useRef<HTMLVideoElement | null>(null);

  const handleToggle = (): void => {
    if (Platform.OS === "web") {
      const video: HTMLVideoElement | null = videoRef.current;
      if (video && video.paused) {
        void video.play().catch(() => {
          // Ignore playback errors triggered before user interaction
        });
      }

      const root: HTMLElement = document.documentElement;
      if (!document.fullscreenElement) {
        void root.requestFullscreen().catch(() => {
          // Ignore errors during fullscreen request
        });
      } else {
        void document.exitFullscreen().catch(() => {
          // Ignore errors during fullscreen exit
        });
      }
    } else {
      if (!player.playing) {
        void player.play();
      }
    }
  };

  return (
    <Pressable style={styles.container as ViewStyle} onPress={handleToggle}>
      <Image
        source={require("@/assets/images/icon.png")}
        resizeMode="contain"
        style={styles.icon as ImageStyle}
      />
      {Platform.OS === "web" ? (
        <ShakaVideo
          uri="https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8"
          videoRef={videoRef}
        />
      ) : (
        <VideoView
          style={styles.video as ViewStyle}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      )}
    </Pressable>
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
