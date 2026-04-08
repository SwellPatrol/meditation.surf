/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  BackgroundLayerLayout,
  BackgroundVideoPlaybackPolicy,
} from "@meditation-surf/core";
import type { PlaybackSource } from "@meditation-surf/player-core";
import type { VideoPlayer, VideoSource } from "expo-video";

/**
 * @brief Adapt the shared background video model into Expo runtime behavior
 *
 * Expo keeps its player implementation local. This controller owns the mapping
 * from the shared background video model to Expo video source and playback
 * configuration.
 */
export class ExpoBackgroundVideoController {
  private readonly backgroundLayer: BackgroundLayerLayout;

  /**
   * @brief Capture the shared background video model used by the Expo app
   *
   * @param backgroundLayer - Shared fullscreen background layer
   */
  public constructor(backgroundLayer: BackgroundLayerLayout) {
    this.backgroundLayer = backgroundLayer;
  }

  /**
   * @brief Build the Expo-specific source shape from the shared background model
   *
   * @returns Expo video source metadata for the runtime player
   */
  public createVideoSource(): VideoSource {
    const playbackSource: PlaybackSource = this.backgroundLayer
      .getBackgroundVideo()
      .getPlaybackSource();

    return {
      contentType: "hls",
      uri: playbackSource.url,
    };
  }

  /**
   * @brief Apply the shared playback policy to the Expo player instance
   *
   * @param player - Expo video player instance
   */
  public configurePlayer(player: VideoPlayer): void {
    const playbackPolicy: BackgroundVideoPlaybackPolicy = this.backgroundLayer
      .getBackgroundVideo()
      .getPlaybackPolicy();

    player.loop = playbackPolicy.loop;
    player.muted = playbackPolicy.muted;
  }

  /**
   * @brief Start playback once the Expo player is ready
   *
   * @param player - Expo video player instance
   */
  public startPlayback(player: VideoPlayer): void {
    player.play();
  }

  /**
   * @brief Return the VideoView props owned by the shared playback policy
   *
   * @returns Expo VideoView configuration derived from the shared model
   */
  public getVideoViewProps(): {
    contentFit: "cover";
    playsInline: boolean;
  } {
    const playbackPolicy: BackgroundVideoPlaybackPolicy = this.backgroundLayer
      .getBackgroundVideo()
      .getPlaybackPolicy();

    return {
      contentFit: playbackPolicy.objectFit,
      playsInline: playbackPolicy.playsInline,
    };
  }
}
