/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { useVideoPlayer, VideoView } from "expo-video";
import type { VideoPlayer } from "expo-video/build/VideoPlayer.types";
import type { JSX } from "react";
import React, { useEffect } from "react";
import { StyleSheet, type ViewStyle } from "react-native";

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({ uri }: ShakaVideoProps): JSX.Element {
  const player: VideoPlayer = useVideoPlayer({ uri });

  useEffect(() => {
    void player.play();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.video as ViewStyle}
      nativeControls
      allowsFullscreen
      contentFit="cover"
    />
  );
}

interface Styles {
  readonly video: ViewStyle;
}

const styles: StyleSheet.NamedStyles<Styles> = StyleSheet.create<Styles>({
  video: {
    // Position the video absolutely so that it layers above any placeholders,
    // mirroring the behavior of the web <video> element.
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
});
