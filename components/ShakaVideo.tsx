/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import shaka from "shaka-player/dist/shaka-player.compiled.js";

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

    const player: shaka.Player = new shaka.Player(video);

    player.load(uri).catch((error: Error) => {
      console.error("Shaka Player error", error);
    });

    return () => {
      void player.destroy();
    };
  }, [uri]);

  if (Platform.OS !== "web") {
    return null;
  }

  return <video ref={videoRef} style={styles.video} autoPlay loop muted />;
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
});
