/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { BackgroundVideoModel } from "./BackgroundVideoModel";
import type { Catalog, MediaItem } from "./catalog";
import type { ForegroundUiModel } from "./ForegroundUiModel";

/**
 * @brief Runtime-agnostic app scene for meditation.surf
 *
 * The current product surface is intentionally simple: a background video plus
 * foreground UI. Keeping that structure explicit in one object gives each app
 * a clear model to adapt without centralizing rendering decisions.
 */
export class MeditationExperience {
  public readonly backgroundVideo: BackgroundVideoModel;
  public readonly foregroundUi: ForegroundUiModel;
  public readonly catalog: Catalog;

  /**
   * @brief Create a meditation experience from its domain submodels
   *
   * @param backgroundVideo - Shared background video model
   * @param foregroundUi - Shared foreground UI model
   * @param catalog - Shared content catalog model
   */
  public constructor(
    backgroundVideo: BackgroundVideoModel,
    foregroundUi: ForegroundUiModel,
    catalog: Catalog,
  ) {
    this.backgroundVideo = backgroundVideo;
    this.foregroundUi = foregroundUi;
    this.catalog = catalog;
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
