/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  CommittedPlaybackDecision,
  MediaItem,
  MeditationExperience,
  PlaybackSequenceController,
  PlaybackSequenceState,
} from "@meditation-surf/core";
import type { BackgroundLayerLayout } from "@meditation-surf/layout";
import type {
  IPlaybackController,
  PlaybackSource,
  PlaybackVisualReadinessController,
} from "@meditation-surf/player-core";

/**
 * @brief Adapt the shared background scene into TV playback behavior
 *
 * Lightning still owns the runtime-specific player implementation. This class
 * simply coordinates the shared experience with that TV-specific adapter.
 */
export class TvBackgroundVideoController {
  private readonly experience: MeditationExperience;
  private readonly backgroundLayer: BackgroundLayerLayout;
  private readonly playbackSequenceController: PlaybackSequenceController;
  private readonly playbackController: IPlaybackController & {
    setDisplayBounds(
      left: number,
      top: number,
      width: number,
      height: number,
    ): void;
  };
  private readonly playbackVisualReadinessController: PlaybackVisualReadinessController;
  private currentSourceUrl: string | null;
  private removePlaybackSequenceSubscription: (() => void) | null;

  /**
   * @brief Build the TV background playback controller
   *
   * @param experience - Shared meditation experience
   * @param backgroundLayer - Shared fullscreen background layer
   * @param playbackController - TV-specific playback adapter
   */
  public constructor(
    experience: MeditationExperience,
    backgroundLayer: BackgroundLayerLayout,
    playbackSequenceController: PlaybackSequenceController,
    playbackController: IPlaybackController & {
      setDisplayBounds(
        left: number,
        top: number,
        width: number,
        height: number,
      ): void;
    },
    playbackVisualReadinessController: PlaybackVisualReadinessController,
  ) {
    this.experience = experience;
    this.backgroundLayer = backgroundLayer;
    this.playbackSequenceController = playbackSequenceController;
    this.playbackController = playbackController;
    this.playbackVisualReadinessController = playbackVisualReadinessController;
    this.currentSourceUrl = null;
    this.removePlaybackSequenceSubscription = null;
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
    this.removePlaybackSequenceSubscription =
      this.playbackSequenceController.subscribe(
        (playbackSequenceState: PlaybackSequenceState): void => {
          void this.handlePlaybackSequenceState(playbackSequenceState);
        },
      );
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
    this.removePlaybackSequenceSubscription?.();
    this.removePlaybackSequenceSubscription = null;
    await this.playbackController.destroy();
  }

  /**
   * @brief Resolve the shared playback source used for the TV background
   *
   * @returns Playback source chosen by the shared experience
   */
  private getPlaybackSource(): PlaybackSource {
    const activeItem: MediaItem | null = this.experience.getActiveItem();

    return (
      activeItem?.getPlaybackSource() ??
      this.backgroundLayer.getBackgroundVideo().getPlaybackSource()
    );
  }

  /**
   * @brief Apply active-item changes to the TV playback adapter
   *
   * @param playbackSequenceState - Shared playback sequence snapshot
   */
  private async handlePlaybackSequenceState(
    playbackSequenceState: PlaybackSequenceState,
  ): Promise<void> {
    const activeItem: MediaItem | null = playbackSequenceState.activeItem;
    const committedPlaybackDecision: CommittedPlaybackDecision | null =
      playbackSequenceState.committedPlaybackDecision;
    const playbackSource: PlaybackSource =
      activeItem?.getPlaybackSource() ?? this.getPlaybackSource();
    const shouldMute: boolean = this.resolveMutedState(
      committedPlaybackDecision,
    );

    if (this.currentSourceUrl === playbackSource.url) {
      this.playbackController.setMuted(shouldMute);
      return;
    }

    this.currentSourceUrl = playbackSource.url;
    this.playbackVisualReadinessController.beginLoading();
    await this.playbackController.load(playbackSource);
    await this.playbackController.play();
    this.playbackController.setMuted(shouldMute);
  }

  /**
   * @brief Resolve whether committed background playback should be muted
   *
   * @param committedPlaybackDecision - Current committed playback decision
   *
   * @returns `true` when TV background playback should remain muted
   */
  private resolveMutedState(
    committedPlaybackDecision: CommittedPlaybackDecision | null,
  ): boolean {
    return (
      committedPlaybackDecision?.audioActivationMode === undefined ||
      committedPlaybackDecision.audioActivationMode === "muted-preview"
    );
  }
}
