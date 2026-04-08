/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  type CenteredOverlaySize,
  DemoExperienceFactory,
  type MeditationExperience,
  type OverlayState,
} from "@meditation-surf/core";
import { useVideoPlayer, type VideoPlayer, VideoView } from "expo-video";
import { type JSX, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  useWindowDimensions,
  View,
} from "react-native";

import { ExpoApp } from "./src/bootstrap/ExpoApp";
import { ExpoExperienceAdapter } from "./src/experience/ExpoExperienceAdapter";

const experience: MeditationExperience = DemoExperienceFactory.create();
const app: ExpoApp = new ExpoApp(experience);

export default function App(): JSX.Element {
  const experienceAdapter: ExpoExperienceAdapter = app.getExperienceAdapter();
  const windowDimensions: { width: number; height: number } =
    useWindowDimensions();
  const overlayOpacity: Animated.Value = useRef<Animated.Value>(
    new Animated.Value(1),
  ).current;
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

  useEffect((): (() => void) => {
    return experienceAdapter.overlayController.subscribe(
      (overlayState: OverlayState): void => {
        Animated.timing(overlayOpacity, {
          toValue: overlayState.visibility === "visible" ? 1 : 0,
          duration:
            experienceAdapter.overlayController.getConfig().fadeDurationMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      },
    );
  }, [experienceAdapter, overlayOpacity]);

  const dynamicIconStyle: CenteredOverlaySize =
    experienceAdapter.appLayoutController.getCenteredOverlaySize(
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
  const pressableProps: PressableProps = {
    onPress: (): void => {
      experienceAdapter.overlayController.dispatch("INTERACT");
    },
    style: experienceAdapter.appLayoutController.getContainerStyle(),
  };

  return (
    <Pressable {...pressableProps}>
      <VideoView
        contentFit={videoViewProps.objectFit}
        nativeControls={false}
        player={videoPlayer}
        playsInline={videoViewProps.playsInline}
        style={experienceAdapter.appLayoutController.getBackgroundLayerStyle()}
      />
      <View
        pointerEvents="none"
        style={experienceAdapter.appLayoutController.getForegroundLayerStyle()}
      >
        <Animated.Image
          resizeMode="contain"
          source={experienceAdapter.appLayoutController.getCenteredOverlaySource()}
          style={[
            experienceAdapter.appLayoutController.getCenteredOverlayStyle(),
            dynamicIconStyle,
            {
              opacity: overlayOpacity,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}
