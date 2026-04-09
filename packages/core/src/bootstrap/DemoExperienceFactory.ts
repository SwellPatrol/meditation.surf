/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { PlaybackVisualReadinessController } from "@meditation-surf/player-core";

import { Catalog } from "../catalog/Catalog";
import { FixtureCatalog } from "../catalog/FixtureCatalog";
import { MeditationExperience } from "../experience/MeditationExperience";
import { AppLayout } from "../layout/AppLayout";
import { BackgroundLayerLayout } from "../layout/BackgroundLayerLayout";
import {
  CenteredOverlayLayout,
  DEMO_CENTERED_OVERLAY_LAYOUT,
} from "../layout/CenteredOverlayLayout";
import { ForegroundLayerLayout } from "../layout/ForegroundLayerLayout";
import { BackgroundVideoModel } from "../playback/BackgroundVideoModel";
import { DemoBackgroundVideo } from "../playback/DemoBackgroundVideo";
import { PlaybackSequenceController } from "../playback/PlaybackSequenceController";
import { OverlayController } from "../ui/OverlayController";
import { OverlayRevealHandoffController } from "../ui/OverlayRevealHandoffController";

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
    const centeredOverlayLayout: CenteredOverlayLayout =
      DEMO_CENTERED_OVERLAY_LAYOUT;
    const appLayout: AppLayout = new AppLayout(
      new BackgroundLayerLayout(backgroundVideo),
      new ForegroundLayerLayout(centeredOverlayLayout),
    );
    const catalog: Catalog = FixtureCatalog.getCatalog();
    const overlayController: OverlayController = new OverlayController();
    const playbackVisualReadinessController: PlaybackVisualReadinessController =
      new PlaybackVisualReadinessController();
    const overlayRevealHandoffController: OverlayRevealHandoffController =
      new OverlayRevealHandoffController(
        overlayController,
        playbackVisualReadinessController,
      );
    const playbackSequenceController: PlaybackSequenceController =
      new PlaybackSequenceController(catalog);

    return new MeditationExperience(
      appLayout,
      catalog,
      overlayController,
      overlayRevealHandoffController,
      playbackVisualReadinessController,
      playbackSequenceController,
    );
  }
}
