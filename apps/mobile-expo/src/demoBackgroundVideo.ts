/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  BackgroundVideoModel,
  BackgroundVideoPlaybackPolicy,
} from "@meditation-surf/core";
import type { VideoPlayer, VideoSource } from "expo-video";

/**
 * @brief Build the Expo-specific source shape from a shared background model
 *
 * @param backgroundVideo - Shared background video model
 *
 * @returns Expo video source metadata for the runtime player
 */
export function createExpoVideoSource(
  backgroundVideo: BackgroundVideoModel,
): VideoSource {
  const playbackSource: { url: string } = backgroundVideo.getPlaybackSource();

  return {
    contentType: "hls",
    uri: playbackSource.url,
  };
}

/**
 * @brief Apply the minimal playback flags expected by the Expo demo background
 *
 * @param player - Expo video player instance
 * @param backgroundVideo - Shared background video model
 */
export function configureExpoVideoPlayer(
  player: VideoPlayer,
  backgroundVideo: BackgroundVideoModel,
): void {
  const playbackPolicy: BackgroundVideoPlaybackPolicy =
    backgroundVideo.getPlaybackPolicy();

  player.loop = playbackPolicy.loop;
  player.muted = playbackPolicy.muted;
}
