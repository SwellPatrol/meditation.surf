/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import React, { useEffect, useRef } from "react";
import { JSX } from "react/jsx-runtime";
import { Platform, StyleSheet } from "react-native";
import type * as shakaNamespace from "shaka-player/dist/shaka-player.compiled.js";

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({
  uri,
}: ShakaVideoProps): JSX.Element | null {
  const videoRef: React.RefObject<HTMLVideoElement | null> =
    useRef<HTMLVideoElement | null>(null);

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
        // Create the Shaka Player without attaching it to a media element.
        player = new shaka.Player();

        // Attach the video element to the player. This returns a Promise
        // that resolves when the player is ready to load content.
        return player.attach(video);
      })
      .then(() => {
        // Load the media once the player has been attached to the element.
        return player!.load(uri);
      })
      .then(() => {
        // Attempt to autoplay the video. This may fail if user interaction is
        // required by the browser.
        void video.play().catch(() => {
          // Autoplay was blocked; playback will require user interaction.
        });
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

  return (
    <video
      ref={videoRef}
      style={styles.video}
      autoPlay
      loop
      muted
      playsInline
      onClick={(): void => {
        void videoRef.current?.play();
      }}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    // Position the video absolutely so that it layers above any
    // placeholders such as the application icon. This mirrors the
    // behavior of the native <Video> component used on mobile.
    ...StyleSheet.absoluteFillObject,
    // Explicit dimensions ensure the video fills the viewport on web.
    width: "100%",
    height: "100%",
    // Place the video above the icon placeholder.
    zIndex: 1,
    // Ensure the video covers the entire area without distortion.
    objectFit: "cover",
  },
});
