/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PlaybackVisualReadinessController } from "@meditation-surf/player-core";

import type { Catalog } from "../catalog/Catalog";
import type { MediaItem } from "../catalog/MediaItem";
import type { AppLayout } from "../layout/AppLayout";
import type { ForegroundLayerLayout } from "../layout/ForegroundLayerLayout";
import type { BackgroundVideoModel } from "../playback/BackgroundVideoModel";
import type { OverlayController } from "../ui/OverlayController";

/**
 * @brief Runtime-agnostic app scene for meditation.surf
 *
 * The current product surface is intentionally simple: a background video plus
 * foreground UI. Keeping that structure explicit in one object gives each app
 * a clear model to adapt without centralizing rendering decisions.
 */
export class MeditationExperience {
  public readonly appLayout: AppLayout;
  public readonly catalog: Catalog;
  public readonly overlayController: OverlayController;
  public readonly playbackVisualReadinessController: PlaybackVisualReadinessController;

  /**
   * @brief Create a meditation experience from its domain submodels
   *
   * @param appLayout - Shared app-surface layout model
   * @param catalog - Shared content catalog model
   * @param overlayController - Shared overlay interaction state controller
   * @param playbackVisualReadinessController - Shared playback visual readiness controller
   */
  public constructor(
    appLayout: AppLayout,
    catalog: Catalog,
    overlayController: OverlayController,
    playbackVisualReadinessController: PlaybackVisualReadinessController,
  ) {
    this.appLayout = appLayout;
    this.catalog = catalog;
    this.overlayController = overlayController;
    this.playbackVisualReadinessController = playbackVisualReadinessController;
  }

  /**
   * @brief Return the shared background video for the current app surface
   *
   * @returns Shared background video model
   */
  public getBackgroundVideo(): BackgroundVideoModel {
    return this.appLayout.getBackgroundLayer().getBackgroundVideo();
  }

  /**
   * @brief Return the shared foreground layer for the current app surface
   *
   * @returns Shared fullscreen foreground layer
   */
  public getForegroundLayer(): ForegroundLayerLayout {
    return this.appLayout.getForegroundLayer();
  }

  /**
   * @brief Return the shared centered-overlay interaction controller
   *
   * @returns Shared overlay interaction controller
   */
  public getOverlayController(): OverlayController {
    return this.overlayController;
  }

  /**
   * @brief Return the shared playback visual readiness controller
   *
   * @returns Shared loading-versus-visual-ready playback controller
   */
  public getPlaybackVisualReadinessController(): PlaybackVisualReadinessController {
    return this.playbackVisualReadinessController;
  }

  /**
   * @brief Return the featured item chosen by the catalog
   *
   * @returns The featured media item, or `null` when the catalog is empty
   */
  public getFeaturedItem(): MediaItem | null {
    return this.catalog.getFeaturedItem();
  }
}
