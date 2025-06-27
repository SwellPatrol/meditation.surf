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
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";

export interface ShakaVideoProps {
  readonly uri: string;
}

export default function ShakaVideo({ uri }: ShakaVideoProps): JSX.Element {
  const player: VideoPlayer = useVideoPlayer({ uri });
  const [showControls, setShowControls]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ] = useState<boolean>(false);

  useEffect(() => {
    void player.play();
  }, [player]);

  const toggleControls = (): void => {
    setShowControls((visible: boolean): boolean => !visible);
  };

  return (
    <Pressable
      style={styles.video as ViewStyle}
      onPress={toggleControls}
      pointerEvents={showControls ? "box-none" : "auto"}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill as ViewStyle}
        nativeControls={showControls}
        allowsFullscreen
        contentFit="cover"
      />
    </Pressable>
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
