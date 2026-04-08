/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MeditationExperience } from "@meditation-surf/core";

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
  public readonly appLayoutController: TvAppLayoutController;
  public readonly backgroundVideoController: TvBackgroundVideoController;

  /**
   * @brief Build TV runtime adapters for the shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.appLayoutController = new TvAppLayoutController(experience.appLayout);
    this.backgroundVideoController = new TvBackgroundVideoController(
      experience,
      experience.appLayout.getBackgroundLayer(),
      lightningPlaybackAdapter,
    );
  }
}
