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
  type PlaybackSequenceState,
} from "@meditation-surf/core";
import type { PlaybackVisualReadinessState } from "@meditation-surf/player-core";
import { useVideoPlayer, type VideoPlayer, VideoView } from "expo-video";
import { type JSX, useEffect, useRef, useState } from "react";
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
  const [overlayTitle, setOverlayTitle] = useState<string>(
    experienceAdapter.playbackSequenceController.getActiveItemTitle() ?? "",
  );
  const loadingOpacity: Animated.Value = useRef<Animated.Value>(
    new Animated.Value(1),
  ).current;
  const overlayOpacity: Animated.Value = useRef<Animated.Value>(
    new Animated.Value(0),
  ).current;
  const videoPlayer: VideoPlayer = useVideoPlayer(
    experienceAdapter.backgroundVideoController.createVideoSource(),
    (player: VideoPlayer): void => {
      experienceAdapter.backgroundVideoController.configurePlayer(player);
    },
  );

  useEffect((): (() => void) => {
    const removePlaybackSequenceSubscription: () => void =
      experienceAdapter.backgroundVideoController.connectPlayer(videoPlayer);

    return (): void => {
      removePlaybackSequenceSubscription();
    };
  }, [experienceAdapter, videoPlayer]);

  useEffect((): (() => void) => {
    return experienceAdapter.playbackSequenceController.subscribe(
      (playbackSequenceState: PlaybackSequenceState): void => {
        setOverlayTitle(playbackSequenceState.activeItem?.title ?? "");
      },
    );
  }, [experienceAdapter]);

  useEffect((): (() => void) => {
    return experienceAdapter.playbackVisualReadinessController.subscribe(
      (playbackVisualReadinessState: PlaybackVisualReadinessState): void => {
        Animated.timing(loadingOpacity, {
          toValue: playbackVisualReadinessState.readiness === "loading" ? 1 : 0,
          duration:
            experienceAdapter.overlayController.getConfig().fadeDurationMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      },
    );
  }, [experienceAdapter, loadingOpacity]);

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

  const dynamicLoadingIconStyle: CenteredOverlaySize =
    experienceAdapter.appLayoutController.getCenteredOverlaySize(
      windowDimensions.width,
      windowDimensions.height,
    );
  const videoViewProps: {
    objectFit: "cover";
    onFirstFrameRender: () => void;
    playsInline: boolean;
  } = {
    objectFit:
      experienceAdapter.backgroundVideoController.getVideoViewProps()
        .contentFit,
    onFirstFrameRender:
      experienceAdapter.backgroundVideoController.getVideoViewProps()
        .onFirstFrameRender,
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
        onFirstFrameRender={videoViewProps.onFirstFrameRender}
        player={videoPlayer}
        playsInline={videoViewProps.playsInline}
        style={experienceAdapter.appLayoutController.getBackgroundLayerStyle()}
      />
      <View
        pointerEvents="none"
        style={experienceAdapter.appLayoutController.getLoadingPlaneStyle()}
      >
        <Animated.Image
          resizeMode="contain"
          source={experienceAdapter.appLayoutController.getCenteredOverlaySource()}
          style={[
            experienceAdapter.appLayoutController.getCenteredOverlayStyle(),
            dynamicLoadingIconStyle,
            {
              opacity: loadingOpacity,
            },
          ]}
        />
      </View>
      <View
        accessible={false}
        pointerEvents="none"
        style={experienceAdapter.appLayoutController.getOverlayUiPlaneStyle()}
      >
        <Animated.Text
          accessibilityRole="header"
          allowFontScaling={true}
          style={[
            experienceAdapter.appLayoutController.getOverlayTitleStyle(),
            {
              opacity: overlayOpacity,
            },
          ]}
        >
          {overlayTitle}
        </Animated.Text>
      </View>
    </Pressable>
  );
}
