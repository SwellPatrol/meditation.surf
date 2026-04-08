/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaItem, MeditationExperience } from "@meditation-surf/core";
import type {
  IPlaybackController,
  PlaybackSource,
} from "@meditation-surf/player-core";

/**
 * @brief Adapt the shared background scene into TV playback behavior
 *
 * Lightning still owns the runtime-specific player implementation. This class
 * simply coordinates the shared experience with that TV-specific adapter.
 */
export class TvBackgroundVideoController {
  private readonly experience: MeditationExperience;
  private readonly playbackController: IPlaybackController & {
    setDisplayBounds(
      left: number,
      top: number,
      width: number,
      height: number,
    ): void;
  };

  /**
   * @brief Build the TV background playback controller
   *
   * @param experience - Shared meditation experience
   * @param playbackController - TV-specific playback adapter
   */
  public constructor(
    experience: MeditationExperience,
    playbackController: IPlaybackController & {
      setDisplayBounds(
        left: number,
        top: number,
        width: number,
        height: number,
      ): void;
    },
  ) {
    this.experience = experience;
    this.playbackController = playbackController;
  }

  /**
   * @brief Prepare the TV playback adapter for background playback
   */
  public initialize(): void {
    this.playbackController.initialize();
  }

  /**
   * @brief Start playback for the shared experience background
   *
   * @returns A promise that resolves after playback has been attempted
   */
  public async start(): Promise<void> {
    const playbackSource: PlaybackSource = this.getPlaybackSource();

    await this.playbackController.load(playbackSource);
    await this.playbackController.play();
  }

  /**
   * @brief Forward fitted stage bounds to the TV playback adapter
   *
   * @param left - Left edge of the fitted stage in pixels
   * @param top - Top edge of the fitted stage in pixels
   * @param width - Width of the fitted stage in pixels
   * @param height - Height of the fitted stage in pixels
   */
  public setDisplayBounds(
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    this.playbackController.setDisplayBounds(left, top, width, height);
  }

  /**
   * @brief Tear down runtime-specific playback resources
   *
   * @returns A promise that resolves after playback teardown finishes
   */
  public async destroy(): Promise<void> {
    await this.playbackController.destroy();
  }

  /**
   * @brief Resolve the shared playback source used for the TV background
   *
   * @returns Playback source chosen by the shared experience
   */
  private getPlaybackSource(): PlaybackSource {
    const featuredItem: MediaItem | null = this.experience.getFeaturedItem();

    return (
      featuredItem?.getPlaybackSource() ??
      this.experience.backgroundVideo.getPlaybackSource()
    );
  }
}
