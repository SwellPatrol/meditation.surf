/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { DEMO_BACKGROUND_VIDEO_POLICY } from "@meditation-surf/core";
import {
  BRAND_OVERLAY_ICON_SOURCE,
  getNativeBrandOverlayImageStyle,
  type NativeBrandOverlayImageStyle,
} from "@meditation-surf/core/brand/native";
import { useVideoPlayer, type VideoPlayer, VideoView } from "expo-video";
import { type JSX, useEffect } from "react";
import {
  Image,
  type ImageStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";

import {
  configureExpoDemoVideoPlayer,
  createExpoDemoVideoSource,
} from "./src/demoBackgroundVideo";

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
  resizeMode: "contain",
};

export default function App(): JSX.Element {
  const windowDimensions: { width: number; height: number } =
    useWindowDimensions();
  const videoPlayer: VideoPlayer = useVideoPlayer(
    createExpoDemoVideoSource(),
    (player: VideoPlayer): void => {
      configureExpoDemoVideoPlayer(player);
    },
  );

  useEffect((): void => {
    // On web, play() needs to run after the underlying <video> has mounted.
    videoPlayer.play();
  }, [videoPlayer]);

  const dynamicIconStyle: NativeBrandOverlayImageStyle =
    getNativeBrandOverlayImageStyle(
      windowDimensions.width,
      windowDimensions.height,
    );

  return (
    <View style={containerStyle}>
      <VideoView
        contentFit={DEMO_BACKGROUND_VIDEO_POLICY.objectFit}
        nativeControls={false}
        player={videoPlayer}
        playsInline={DEMO_BACKGROUND_VIDEO_POLICY.playsInline}
        style={backgroundVideoStyle}
      />
      <View pointerEvents="none" style={overlayStyle}>
        <Image
          resizeMode="contain"
          source={BRAND_OVERLAY_ICON_SOURCE}
          style={[iconStyle, dynamicIconStyle]}
        />
      </View>
    </View>
  );
}
