/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MeditationExperience } from "@meditation-surf/core";

import { WebAppLayoutController } from "../layout/WebAppLayoutController";
import { WebBackgroundVideoController } from "../playback/WebBackgroundVideoController";

/**
 * @brief Group web runtime adapters around a shared meditation experience
 *
 * The shared scene model stays in `packages/core`, while web-specific
 * adaptation lives here beside the web app.
 */
export class WebExperienceAdapter {
  public readonly appLayoutController: WebAppLayoutController;
  public readonly backgroundVideoController: WebBackgroundVideoController;

  /**
   * @brief Build web runtime adapters for the shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.appLayoutController = new WebAppLayoutController(experience.appLayout);
    this.backgroundVideoController = new WebBackgroundVideoController(
      experience.appLayout.getBackgroundLayer(),
    );
  }
}
