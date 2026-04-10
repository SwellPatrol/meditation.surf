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
  type MediaExecutionController,
  type MediaKernelController,
  type MediaThumbnailController,
  type MeditationExperience,
  type OverlayController,
  type PlaybackSequenceController,
} from "@meditation-surf/core";
import type { PlaybackVisualReadinessController } from "@meditation-surf/player-core";

import { WebAppLayoutController } from "../layout/WebAppLayoutController";
import { WebMediaRuntimeAdapter } from "../media/WebMediaRuntimeAdapter";
import { WebMediaThumbnailRuntimeAdapter } from "../media/WebMediaThumbnailRuntimeAdapter";
import { WebPreviewSurfaceRegistry } from "../media/WebPreviewSurfaceRegistry";
import { WebBackgroundVideoController } from "../playback/WebBackgroundVideoController";

/**
 * @brief Group web runtime adapters around a shared meditation experience
 *
 * The shared scene model stays in `packages/core`, while web-specific
 * adaptation lives here beside the web app.
 */
export class WebExperienceAdapter {
  private static readonly MEDIA_CAPABILITY_PROFILE: MediaCapabilityProfile = {
    supportsNativePlayback: true,
    supportsShakaPlayback: true,
    supportsPreviewVideo: true,
    supportsThumbnailExtraction: true,
    supportsWorkerOffload: true,
    supportsWebGPUPreferred: false,
    supportsWebGLFallback: false,
    supportsCustomPipeline: false,
    supportsPremiumPlayback: true,
  };

  public readonly appLayoutController: WebAppLayoutController;
  public readonly backgroundVideoController: WebBackgroundVideoController;
  public readonly browseContentAdapter: BrowseContentAdapter;
  public readonly browseFocusController: BrowseFocusController;
  public readonly browseInteractionController: BrowseInteractionController;
  public readonly browseSelectionController: BrowseSelectionController;
  public readonly mediaKernelController: MediaKernelController;
  public readonly mediaExecutionController: MediaExecutionController;
  public readonly overlayController: OverlayController;
  public readonly playbackSequenceController: PlaybackSequenceController;
  public readonly playbackVisualReadinessController: PlaybackVisualReadinessController;
  public readonly previewSurfaceRegistry: WebPreviewSurfaceRegistry;
  public readonly mediaThumbnailController: MediaThumbnailController;

  /**
   * @brief Build web runtime adapters for the shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.mediaKernelController = experience.getMediaKernelController();
    this.mediaExecutionController = experience.getMediaExecutionController();
    this.mediaThumbnailController = experience.getMediaThumbnailController();
    this.previewSurfaceRegistry = new WebPreviewSurfaceRegistry();
    this.mediaKernelController.reportAppCapabilities(
      "web-vite",
      WebExperienceAdapter.MEDIA_CAPABILITY_PROFILE,
    );
    this.mediaThumbnailController.setRuntimeAdapter(
      new WebMediaThumbnailRuntimeAdapter(),
    );
    this.mediaExecutionController.setRuntimeAdapter(
      new WebMediaRuntimeAdapter(
        experience.catalog,
        experience.getPlaybackSequenceController(),
        this.previewSurfaceRegistry,
      ),
    );
    this.appLayoutController = new WebAppLayoutController(experience.appLayout);
    this.backgroundVideoController = new WebBackgroundVideoController(
      experience.appLayout.getBackgroundLayer(),
      experience.getPlaybackSequenceController(),
      experience.getPlaybackVisualReadinessController(),
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
    this.playbackVisualReadinessController =
      experience.getPlaybackVisualReadinessController();
  }
}
