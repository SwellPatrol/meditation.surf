/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { DEMO_CATALOG } from "./catalog/demoCatalog";
import { createDemoBackgroundVideo } from "./demoBackgroundVideo";
import { DEMO_CENTERED_ICON_OVERLAY, ForegroundUiModel } from "./foregroundUi";
import { MeditationExperience } from "./MeditationExperience";

/**
 * @brief Factory that assembles the current demo meditation experience
 *
 * The factory keeps demo assembly logic in one place so apps can consume a
 * single coherent product model instead of rebuilding the same structure.
 */
export class DemoExperienceFactory {
  /**
   * @brief Build the canonical demo experience
   *
   * @returns Shared demo experience with background video and foreground UI
   */
  public static create(): MeditationExperience {
    const backgroundVideo: ReturnType<typeof createDemoBackgroundVideo> =
      createDemoBackgroundVideo();
    const foregroundUi: ForegroundUiModel = new ForegroundUiModel([
      DEMO_CENTERED_ICON_OVERLAY,
    ]);

    return new MeditationExperience(
      backgroundVideo,
      foregroundUi,
      DEMO_CATALOG,
    );
  }
}
