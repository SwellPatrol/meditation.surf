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
  MediaItem,
  PlaybackSequenceController,
  PlaybackSequenceState,
} from "@meditation-surf/core";
import type {
  PlaybackSource,
  PlaybackVisualReadinessController,
} from "@meditation-surf/player-core";
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
  private readonly playbackSequenceController: PlaybackSequenceController;
  private readonly playbackVisualReadinessController: PlaybackVisualReadinessController;

  /**
   * @brief Capture the shared background video model used by the Expo app
   *
   * @param backgroundLayer - Shared fullscreen background layer
   */
  public constructor(
    backgroundLayer: BackgroundLayerLayout,
    playbackSequenceController: PlaybackSequenceController,
    playbackVisualReadinessController: PlaybackVisualReadinessController,
  ) {
    this.backgroundLayer = backgroundLayer;
    this.playbackSequenceController = playbackSequenceController;
    this.playbackVisualReadinessController = playbackVisualReadinessController;
  }

  /**
   * @brief Build the Expo-specific source shape from the shared background model
   *
   * @returns Expo video source metadata for the runtime player
   */
  public createVideoSource(): VideoSource {
    return this.createExpoVideoSource(
      this.playbackSequenceController.getActiveItem()?.getPlaybackSource() ??
        this.backgroundLayer.getBackgroundVideo().getPlaybackSource(),
    );
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
    this.playbackVisualReadinessController.beginLoading();
    player.play();
  }

  /**
   * @brief Subscribe the Expo player to shared active-item changes
   *
   * @param player - Expo video player instance
   *
   * @returns Cleanup callback that removes the active-item subscription
   */
  public connectPlayer(player: VideoPlayer): () => void {
    return this.playbackSequenceController.subscribe(
      (playbackSequenceState: PlaybackSequenceState): void => {
        this.handlePlaybackSequenceState(player, playbackSequenceState);
      },
    );
  }

  /**
   * @brief Return the VideoView props owned by the shared playback policy
   *
   * @returns Expo VideoView configuration derived from the shared model
   */
  public getVideoViewProps(): {
    contentFit: "cover";
    onFirstFrameRender: () => void;
    playsInline: boolean;
  } {
    const playbackPolicy: BackgroundVideoPlaybackPolicy = this.backgroundLayer
      .getBackgroundVideo()
      .getPlaybackPolicy();

    return {
      contentFit: playbackPolicy.objectFit,
      // Expo Video emits this after the first frame is rendered into VideoView.
      onFirstFrameRender: (): void => {
        this.playbackVisualReadinessController.markVisualReady();
      },
      playsInline: playbackPolicy.playsInline,
    };
  }

  /**
   * @brief Build Expo's source object from the shared playback source
   *
   * @param playbackSource - Shared playback source metadata
   *
   * @returns Expo-specific source object
   */
  private createExpoVideoSource(playbackSource: PlaybackSource): VideoSource {
    return {
      contentType: "hls",
      uri: playbackSource.url,
    };
  }

  /**
   * @brief Apply active-item changes to the Expo player instance
   *
   * @param player - Expo video player instance
   * @param playbackSequenceState - Shared playback sequence snapshot
   */
  private handlePlaybackSequenceState(
    player: VideoPlayer,
    playbackSequenceState: PlaybackSequenceState,
  ): void {
    const activeItem: MediaItem | null = playbackSequenceState.activeItem;

    if (activeItem === null) {
      return;
    }

    this.playbackVisualReadinessController.beginLoading();
    player.replace(this.createExpoVideoSource(activeItem.getPlaybackSource()));
    player.play();
  }
}
