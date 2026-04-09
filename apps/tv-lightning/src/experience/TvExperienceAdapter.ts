/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  BrowseContentAdapter,
  type BrowseFocusController,
  BrowseInteractionController,
  type BrowseSelectionController,
  type MediaCapabilityProfile,
  type MediaKernelController,
  type MeditationExperience,
  type OverlayController,
  type PlaybackSequenceController,
} from "@meditation-surf/core";
import type { PlaybackVisualReadinessController } from "@meditation-surf/player-core";

import { TvAppLayoutController } from "../layout/TvAppLayoutController";
import lightningPlaybackAdapter from "../playback/LightningPlaybackAdapter";
import { TvBackgroundVideoController } from "../playback/TvBackgroundVideoController";

/**
 * @brief Group TV runtime adapters around a shared meditation experience
 *
 * The shared scene model stays in `packages/core`, while Lightning-specific
 * adaptation lives here beside the TV app.
 */
export class TvExperienceAdapter {
  private static readonly MEDIA_CAPABILITY_PROFILE: MediaCapabilityProfile = {
    supportsNativePlayback: true,
    supportsShakaPlayback: false,
    supportsPreviewVideo: false,
    supportsThumbnailExtraction: false,
    supportsWorkerOffload: false,
    supportsWebGPUPreferred: false,
    supportsWebGLFallback: false,
    supportsCustomPipeline: true,
    supportsPremiumPlayback: true,
  };

  public readonly appLayoutController: TvAppLayoutController;
  public readonly backgroundVideoController: TvBackgroundVideoController;
  public readonly browseContentAdapter: BrowseContentAdapter;
  public readonly browseFocusController: BrowseFocusController;
  public readonly browseInteractionController: BrowseInteractionController;
  public readonly browseSelectionController: BrowseSelectionController;
  public readonly mediaKernelController: MediaKernelController;
  public readonly overlayController: OverlayController;
  public readonly playbackSequenceController: PlaybackSequenceController;
  public readonly playbackVisualReadinessController: PlaybackVisualReadinessController;

  /**
   * @brief Build TV runtime adapters for the shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    const playbackVisualReadinessController: PlaybackVisualReadinessController =
      experience.getPlaybackVisualReadinessController();

    this.mediaKernelController = experience.getMediaKernelController();
    this.mediaKernelController.reportAppCapabilities(
      "tv-lightning",
      TvExperienceAdapter.MEDIA_CAPABILITY_PROFILE,
    );
    lightningPlaybackAdapter.setPlaybackVisualReadinessController(
      playbackVisualReadinessController,
    );
    this.appLayoutController = new TvAppLayoutController(experience.appLayout);
    this.backgroundVideoController = new TvBackgroundVideoController(
      experience,
      experience.appLayout.getBackgroundLayer(),
      experience.getPlaybackSequenceController(),
      lightningPlaybackAdapter,
      playbackVisualReadinessController,
    );
    this.browseContentAdapter = new BrowseContentAdapter(experience.catalog);
    this.browseFocusController = experience.getBrowseFocusController();
    this.browseSelectionController = experience.getBrowseSelectionController();
    this.browseInteractionController = new BrowseInteractionController(
      this.browseFocusController,
      this.browseSelectionController,
    );
    this.overlayController = experience.getOverlayController();
    this.playbackSequenceController =
      experience.getPlaybackSequenceController();
    this.playbackVisualReadinessController = playbackVisualReadinessController;
  }
}
