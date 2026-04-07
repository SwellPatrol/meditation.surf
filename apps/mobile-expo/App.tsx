/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { DEMO_SURF_VIDEO } from "@meditation-surf/core";
import {
  useVideoPlayer,
  type VideoPlayer,
  type VideoSource,
  VideoView,
} from "expo-video";
import { type JSX, useEffect } from "react";
import { Image, type ImageStyle, View, type ViewStyle } from "react-native";

import swellPatrolIcon from "./icon-1500x1500.png";

const containerStyle: ViewStyle = {
  backgroundColor: "#000000",
  flex: 1,
};

const backgroundVideoStyle: ViewStyle = {
  bottom: 0,
  height: "100%",
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
  width: "100%",
};

const overlayStyle: ViewStyle = {
  alignItems: "center",
  bottom: 0,
  justifyContent: "center",
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
};

const iconStyle: ImageStyle = {
  height: 180,
  resizeMode: "contain",
  width: 180,
};

export default function App(): JSX.Element {
  // Reuse the same shared demo source as the TV-oriented app data path.
  const demoVideoSource: VideoSource = {
    contentType: "hls",
    uri: DEMO_SURF_VIDEO.playbackSource.url,
  };
  const videoPlayer: VideoPlayer = useVideoPlayer(
    demoVideoSource,
    (player: VideoPlayer): void => {
      // The minimal demo should start immediately, stay muted, and keep looping.
      player.loop = true;
      player.muted = true;
    },
  );

  useEffect((): void => {
    // On web, play() needs to run after the underlying <video> has mounted.
    videoPlayer.play();
  }, [videoPlayer]);

  return (
    <View style={containerStyle}>
      <VideoView
        contentFit="cover"
        nativeControls={false}
        player={videoPlayer}
        playsInline={true}
        style={backgroundVideoStyle}
      />
      <View pointerEvents="none" style={overlayStyle}>
        <Image
          resizeMode="contain"
          source={{ uri: swellPatrolIcon }}
          style={iconStyle}
        />
      </View>
    </View>
  );
}
