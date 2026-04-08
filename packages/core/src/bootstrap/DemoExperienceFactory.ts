/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { Catalog } from "../catalog/Catalog";
import { DemoCatalog } from "../catalog/DemoCatalog";
import { MeditationExperience } from "../experience/MeditationExperience";
import { AppLayout } from "../layout/AppLayout";
import { BackgroundLayerLayout } from "../layout/BackgroundLayerLayout";
import { ForegroundLayerLayout } from "../layout/ForegroundLayerLayout";
import { BackgroundVideoModel } from "../playback/BackgroundVideoModel";
import { DemoBackgroundVideo } from "../playback/DemoBackgroundVideo";
import {
  CenteredIconOverlayModel,
  DEMO_CENTERED_ICON_OVERLAY,
} from "../ui/CenteredIconOverlayModel";

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
    const backgroundVideo: BackgroundVideoModel = DemoBackgroundVideo.create();
    const centeredIconOverlay: CenteredIconOverlayModel =
      DEMO_CENTERED_ICON_OVERLAY;
    const appLayout: AppLayout = new AppLayout(
      new BackgroundLayerLayout(backgroundVideo),
      new ForegroundLayerLayout(centeredIconOverlay),
    );
    const catalog: Catalog = DemoCatalog.getCatalog();

    return new MeditationExperience(appLayout, catalog);
  }
}
