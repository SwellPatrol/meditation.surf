/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import type * as shakaNamespace from "shaka-player/dist/shaka-player.compiled.js";

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({
  uri,
}: ShakaVideoProps): JSX.Element | null {
  const videoRef: React.RefObject<HTMLVideoElement> =
    useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const video: HTMLVideoElement | null = videoRef.current;
    if (!video) {
      return;
    }

    let player: shakaNamespace.Player | null = null;

    void import("shaka-player/dist/shaka-player.compiled.js")
      .then((shaka: typeof shakaNamespace) => {
        player = new shaka.Player(video);

        return player.load(uri);
      })
      .catch((error: Error) => {
        console.error("Shaka Player error", error);
      });

    return () => {
      if (player) {
        void player.destroy();
      }
    };
  }, [uri]);

  if (Platform.OS !== "web") {
    return null;
  }

  return <video ref={videoRef} style={styles.video} autoPlay loop muted />;
}

const styles = StyleSheet.create({
  video: {
    // Position the video absolutely so that it layers above any
    // placeholders such as the application icon. This mirrors the
    // behavior of the native <Video> component used on mobile.
    ...StyleSheet.absoluteFillObject,
    // Ensure the video covers the entire area without distortion.
    objectFit: "cover",
  },
});
