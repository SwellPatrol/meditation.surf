/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MeditationExperience } from "@meditation-surf/core";

import { ExpoBackgroundVideoController } from "./ExpoBackgroundVideoController";
import { ExpoForegroundUiController } from "./ExpoForegroundUiController";

/**
 * @brief Group Expo runtime adapters around a shared meditation experience
 *
 * The shared scene model stays in `packages/core`, while Expo-specific
 * adaptation lives here beside the Expo app.
 */
export class ExpoExperienceAdapter {
  public readonly backgroundVideoController: ExpoBackgroundVideoController;
  public readonly foregroundUiController: ExpoForegroundUiController;

  /**
   * @brief Build Expo runtime adapters for the shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.backgroundVideoController = new ExpoBackgroundVideoController(
      experience.backgroundVideo,
    );
    this.foregroundUiController = new ExpoForegroundUiController(
      experience.foregroundUi,
    );
  }
}
