/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  DemoExperienceFactory,
  type MeditationExperience,
} from "@meditation-surf/core";
import { useVideoPlayer, type VideoPlayer, VideoView } from "expo-video";
import { type JSX, useEffect } from "react";
import {
  Image,
  type ImageStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";

import { ExpoApp } from "./src/ExpoApp";
import { ExpoExperienceAdapter } from "./src/ExpoExperienceAdapter";

const experience: MeditationExperience = DemoExperienceFactory.create();
const app: ExpoApp = new ExpoApp(experience);

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
  const experienceAdapter: ExpoExperienceAdapter = app.getExperienceAdapter();
  const windowDimensions: { width: number; height: number } =
    useWindowDimensions();
  const videoPlayer: VideoPlayer = useVideoPlayer(
    experienceAdapter.backgroundVideoController.createVideoSource(),
    (player: VideoPlayer): void => {
      experienceAdapter.backgroundVideoController.configurePlayer(player);
    },
  );

  useEffect((): void => {
    // On web, play() needs to run after the underlying <video> has mounted.
    experienceAdapter.backgroundVideoController.startPlayback(videoPlayer);
  }, [videoPlayer]);

  const dynamicIconStyle: { width: number; height: number } =
    experienceAdapter.foregroundUiController.getOverlayIconStyle(
      windowDimensions.width,
      windowDimensions.height,
    );
  const videoViewProps: {
    objectFit: "cover";
    playsInline: boolean;
  } = {
    objectFit:
      experienceAdapter.backgroundVideoController.getVideoViewProps()
        .contentFit,
    playsInline:
      experienceAdapter.backgroundVideoController.getVideoViewProps()
        .playsInline,
  };

  return (
    <View style={containerStyle}>
      <VideoView
        contentFit={videoViewProps.objectFit}
        nativeControls={false}
        player={videoPlayer}
        playsInline={videoViewProps.playsInline}
        style={backgroundVideoStyle}
      />
      <View pointerEvents="none" style={overlayStyle}>
        <Image
          resizeMode="contain"
          source={experienceAdapter.foregroundUiController.getOverlayIconSource()}
          style={[iconStyle, dynamicIconStyle]}
        />
      </View>
    </View>
  );
}
