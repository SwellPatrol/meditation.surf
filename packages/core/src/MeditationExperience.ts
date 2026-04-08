/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { AppLayout } from "./AppLayout";
import type { BackgroundVideoModel } from "./BackgroundVideoModel";
import type { Catalog } from "./catalog/Catalog";
import type { MediaItem } from "./catalog/MediaItem";
import type { ForegroundLayerLayout } from "./ForegroundLayerLayout";

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

  /**
   * @brief Create a meditation experience from its domain submodels
   *
   * @param appLayout - Shared app-surface layout model
   * @param catalog - Shared content catalog model
   */
  public constructor(appLayout: AppLayout, catalog: Catalog) {
    this.appLayout = appLayout;
    this.catalog = catalog;
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
   * @brief Return the featured item chosen by the catalog
   *
   * @returns The featured media item, or `null` when the catalog is empty
   */
  public getFeaturedItem(): MediaItem | null {
    return this.catalog.getFeaturedItem();
  }
}
