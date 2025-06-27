/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { JSX } from "react";
import React, { useEffect, useRef } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import type * as shakaNamespace from "shaka-player/shaka-player.uncompiled.js";

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({
  uri,
}: ShakaVideoProps): JSX.Element | null {
  const videoRef: React.RefObject<HTMLVideoElement | null> =
    useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video: HTMLVideoElement | null = videoRef.current;
    if (!video) {
      return;
    }

    let player: shakaNamespace.Player | null = null;

    // Dynamically load the uncompiled Shaka Player to ensure compatibility
    // with the latest React Native runtime. The compiled build targets older
    // JavaScript environments and can trigger version mismatch warnings.
    void import("shaka-player/shaka-player.uncompiled.js")
      .then((shaka: typeof shakaNamespace) => {
        // Create the Shaka Player without attaching it to a media element.
        player = new shaka.Player();

        // Attach the video element to the player. This returns a Promise
        // that resolves when the player is ready to load content.
        return player.attach(video);
      })
      .then(() => {
        // Load the media once the player has been attached to the element and
        // begin playback.
        return player!.load(uri).then((): Promise<void> => {
          return video.play().catch((error: Error): void => {
            // Safely ignore autoplay errors which often occur on iOS
            // if the user hasn't interacted with the page yet.
            console.error("Autoplay error", error);
          });
        });
      })
      .catch((error: Error): void => {
        console.error("Shaka Player error", error);
      });

    return (): void => {
      if (player) {
        void player.destroy();
      }
    };
  }, [uri]);

  const handleToggle = (): void => {
    // The video element is attached to the player, so we can use it directly
    const video: HTMLVideoElement | null = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play().catch((error: Error): void => {
        // Ignore playback errors triggered before user interaction
        console.error("Playback error", error);
      });
    }

    const root: HTMLElement = document.documentElement;
    if (!document.fullscreenElement) {
      void root.requestFullscreen().catch((error: Error): void => {
        // Ignore errors during fullscreen request
        console.error("Fullscreen error", error);
      });
    } else {
      void document.exitFullscreen().catch((error: Error): void => {
        // Ignore errors during fullscreen exit
        console.error("Fullscreen exit error", error);
      });
    }
  };

  return (
    <video
      ref={videoRef}
      style={styles.video as React.CSSProperties}
      autoPlay
      loop
      muted
      onClick={handleToggle}
    />
  );
}

// Extend the built-in React Native `ViewStyle` interface with web-only
// properties used by the underlying `<video>` element. React Native's
// style declarations do not include the `objectFit` property since it is
// not supported on native platforms. However, the CSS `object-fit` rule is
// required on web to ensure the video covers its container. Adding the
// property here allows TypeScript to type-check the style object.
interface WebVideoStyle extends ViewStyle {
  readonly objectFit?: React.CSSProperties["objectFit"];
}

interface Styles {
  readonly video: WebVideoStyle;
}

const styles: StyleSheet.NamedStyles<Styles> = StyleSheet.create<Styles>({
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
