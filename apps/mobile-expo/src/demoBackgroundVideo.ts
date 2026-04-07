/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  DEMO_BACKGROUND_VIDEO_POLICY,
  getDemoBackgroundVideoSource,
} from "@meditation-surf/core";
import type { PlaybackSource } from "@meditation-surf/player-core";
import type { VideoPlayer, VideoSource } from "expo-video";

/**
 * @brief Build the Expo-specific source shape from the shared demo playback source
 */
export function createExpoDemoVideoSource(): VideoSource {
  const demoBackgroundVideoSource: PlaybackSource =
    getDemoBackgroundVideoSource();

  return {
    contentType: "hls",
    uri: demoBackgroundVideoSource.url,
  };
}

/**
 * @brief Apply the minimal playback flags expected by the Expo demo background
 */
export function configureExpoDemoVideoPlayer(player: VideoPlayer): void {
  player.loop = DEMO_BACKGROUND_VIDEO_POLICY.loop;
  player.muted = DEMO_BACKGROUND_VIDEO_POLICY.muted;
}
