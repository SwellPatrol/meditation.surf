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
  type MeditationExperience,
  type OverlayController,
  type PlaybackSequenceController,
} from "@meditation-surf/core";
import type { PlaybackVisualReadinessController } from "@meditation-surf/player-core";

import { ExpoBrowseInputAdapter } from "../input/ExpoBrowseInputAdapter";
import { ExpoAppLayoutController } from "../layout/ExpoAppLayoutController";
import { ExpoBackgroundVideoController } from "../playback/ExpoBackgroundVideoController";

/**
 * @brief Group Expo runtime adapters around a shared meditation experience
 *
 * The shared scene model stays in `packages/core`, while Expo-specific
 * adaptation lives here beside the Expo app.
 */
export class ExpoExperienceAdapter {
  public readonly appLayoutController: ExpoAppLayoutController;
  public readonly backgroundVideoController: ExpoBackgroundVideoController;
  public readonly browseContentAdapter: BrowseContentAdapter;
  public readonly browseFocusController: BrowseFocusController;
  public readonly browseInputAdapter: ExpoBrowseInputAdapter;
  public readonly browseInteractionController: BrowseInteractionController;
  public readonly overlayController: OverlayController;
  public readonly playbackSequenceController: PlaybackSequenceController;
  public readonly playbackVisualReadinessController: PlaybackVisualReadinessController;

  /**
   * @brief Build Expo runtime adapters for the shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.appLayoutController = new ExpoAppLayoutController(
      experience.appLayout,
    );
    this.backgroundVideoController = new ExpoBackgroundVideoController(
      experience.appLayout.getBackgroundLayer(),
      experience.getPlaybackSequenceController(),
      experience.getPlaybackVisualReadinessController(),
    );
    this.browseContentAdapter = new BrowseContentAdapter(experience.catalog);
    this.browseFocusController = experience.getBrowseFocusController();
    this.browseInteractionController = new BrowseInteractionController(
      this.browseFocusController,
    );
    this.browseInputAdapter = new ExpoBrowseInputAdapter(
      this.browseInteractionController,
    );
    this.overlayController = experience.getOverlayController();
    this.playbackSequenceController =
      experience.getPlaybackSequenceController();
    this.playbackVisualReadinessController =
      experience.getPlaybackVisualReadinessController();
  }
}
