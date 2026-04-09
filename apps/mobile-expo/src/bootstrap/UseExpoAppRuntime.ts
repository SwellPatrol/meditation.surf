/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  BrowseFocusState,
  BrowseScreenContent,
  CenteredOverlaySize,
  MediaItem,
  OverlayState,
  PlaybackSequenceState,
} from "@meditation-surf/core";
import type { PlaybackVisualReadinessState } from "@meditation-surf/player-core";
import { useVideoPlayer, type VideoPlayer } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, useWindowDimensions } from "react-native";

import type { ExpoExperienceAdapter } from "../experience/ExpoExperienceAdapter";
import type { ExpoBrowseInputBindings } from "../input/ExpoBrowseInputAdapter";
import type { ExpoApp } from "./ExpoApp";

/**
 * @brief Props required to bind Expo runtime state to the shared app
 */
export interface UseExpoAppRuntimeProps {
  readonly app: ExpoApp;
}

/**
 * @brief Video view props consumed by the Expo screen component
 */
export interface ExpoVideoViewProps {
  readonly contentFit: "cover";
  readonly onFirstFrameRender: () => void;
  readonly playsInline: boolean;
}

/**
 * @brief Aggregated runtime state exposed to the Expo app screen
 */
export interface ExpoAppRuntime {
  readonly browseContent: BrowseScreenContent;
  readonly browseFocusState: BrowseFocusState;
  readonly browseInputBindings: ExpoBrowseInputBindings;
  readonly experienceAdapter: ExpoExperienceAdapter;
  readonly loadingOpacity: Animated.Value;
  readonly overlayOpacity: Animated.Value;
  readonly overlaySize: CenteredOverlaySize;
  readonly videoPlayer: VideoPlayer;
  readonly videoViewProps: ExpoVideoViewProps;
}

/**
 * @brief Connect Expo hooks to the shared meditation experience adapters
 *
 * This hook owns the React Native subscriptions and derived view state that
 * power the top-level Expo screen. Keeping it here leaves the entry module
 * and the visual component focused on composition.
 *
 * @param props - Shared Expo app wrapper
 *
 * @returns Runtime state consumed by the Expo screen component
 */
export function useExpoAppRuntime(
  props: UseExpoAppRuntimeProps,
): ExpoAppRuntime {
  const experienceAdapter: ExpoExperienceAdapter =
    props.app.getExperienceAdapter();
  const windowDimensions: { width: number; height: number } =
    useWindowDimensions();
  const [activePlaybackItem, setActivePlaybackItem] =
    useState<MediaItem | null>(
      experienceAdapter.playbackSequenceController.getActiveItem(),
    );
  const [browseFocusState, setBrowseFocusState] = useState<BrowseFocusState>(
    experienceAdapter.browseFocusController.getState(),
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

  // Bind the experience's background video controller to the Expo video player
  useEffect((): (() => void) => {
    const removePlaybackSequenceSubscription: () => void =
      experienceAdapter.backgroundVideoController.connectPlayer(videoPlayer);

    return (): void => {
      removePlaybackSequenceSubscription();
    };
  }, [experienceAdapter, videoPlayer]);

  // Bind the experience adapter's browse content to the Expo screen state
  useEffect((): (() => void) => {
    return experienceAdapter.playbackSequenceController.subscribe(
      (playbackSequenceState: PlaybackSequenceState): void => {
        const nextActivePlaybackItem: MediaItem | null =
          playbackSequenceState.activeItem;
        const nextBrowseContent: BrowseScreenContent =
          experienceAdapter.browseContentAdapter.getBrowseScreenContent(
            nextActivePlaybackItem,
            experienceAdapter.browseFocusController.getState(),
          );
        const rowItemCounts: number[] = nextBrowseContent.rows.map(
          (browseRow): number => browseRow.items.length,
        );

        experienceAdapter.browseFocusController.syncRows(rowItemCounts);
        experienceAdapter.browseSelectionController.syncRows(rowItemCounts);
        setActivePlaybackItem(nextActivePlaybackItem);
      },
    );
  }, [experienceAdapter]);

  // Bind the shared browse focus state to the Expo screen state
  useEffect((): (() => void) => {
    return experienceAdapter.browseFocusController.subscribe(
      (nextBrowseFocusState: BrowseFocusState): void => {
        setBrowseFocusState(nextBrowseFocusState);
      },
    );
  }, [experienceAdapter]);

  // Bind Expo web directional keyboard input to the shared browse controller
  useEffect((): (() => void) => {
    return experienceAdapter.browseInputAdapter.attachDirectionalKeyboardInput();
  }, [experienceAdapter]);

  // Bind the experience adapter's visual readiness state to the loading opacity
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

  // Bind the experience adapter's overlay state to the overlay opacity
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

  const overlaySize: CenteredOverlaySize =
    experienceAdapter.appLayoutController.getCenteredOverlaySize(
      windowDimensions.width,
      windowDimensions.height,
    );
  const browseContent: BrowseScreenContent =
    experienceAdapter.browseContentAdapter.getBrowseScreenContent(
      activePlaybackItem,
      browseFocusState,
    );
  const backgroundVideoViewProps: {
    readonly contentFit: "cover";
    readonly onFirstFrameRender: () => void;
    readonly playsInline: boolean;
  } = experienceAdapter.backgroundVideoController.getVideoViewProps();
  const browseInputBindings: ExpoBrowseInputBindings =
    experienceAdapter.browseInputAdapter.createBrowseInputBindings();

  return {
    browseContent,
    browseFocusState,
    browseInputBindings,
    experienceAdapter,
    loadingOpacity,
    overlayOpacity,
    overlaySize,
    videoPlayer,
    videoViewProps: {
      contentFit: backgroundVideoViewProps.contentFit,
      onFirstFrameRender: backgroundVideoViewProps.onFirstFrameRender,
      playsInline: backgroundVideoViewProps.playsInline,
    },
  };
}
