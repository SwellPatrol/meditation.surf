/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import {
  type CenteredIconOverlayModel,
  DemoExperienceFactory,
  type MediaItem,
  type MeditationExperience,
} from "@meditation-surf/core";

import Icon from "../../components/common/Icon";
import {
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
  subscribeToStageLayout,
} from "../layout/stage";
import lightningPlaybackAdapter from "../playback/LightningPlaybackAdapter";

// Type alias for the factory returned by Blits.Application
type LightningAppFactory = ReturnType<typeof Blits.Application>;
const experience: MeditationExperience = DemoExperienceFactory.create();

type LightningAppState = {
  overlayModel: CenteredIconOverlayModel;
  stageW: number;
  stageH: number;
  viewportW: number;
  viewportH: number;
  stopViewportSync: (() => void) | null;
};

type LightningAppMethods = {
  initializeViewportSync(): void;
  tearDownViewportSync(): void;
};

/**
 * @brief Start the scene background video chosen by the shared experience
 *
 * Lightning still owns TV-specific presentation and playback timing.
 *
 * @param appExperience - Shared meditation experience consumed by the TV app
 */
async function playExperienceBackground(
  appExperience: MeditationExperience,
): Promise<void> {
  const featuredItem: MediaItem | null = appExperience.getFeaturedItem();
  const backgroundSource: ReturnType<MediaItem["getPlaybackSource"]> =
    featuredItem?.getPlaybackSource() ??
    appExperience.backgroundVideo.getPlaybackSource();

  await lightningPlaybackAdapter.load(backgroundSource);
  await lightningPlaybackAdapter.play();
}

/**
 * @brief Return the shared centered icon overlay required by the TV scene
 *
 * @returns Shared centered icon overlay model
 */
function getCenteredIconOverlayModel(): CenteredIconOverlayModel {
  const centeredIconOverlay: CenteredIconOverlayModel | null =
    experience.foregroundUi.getCenteredIconOverlay();

  if (centeredIconOverlay === null) {
    throw new Error("Expected the demo experience to expose a centered icon.");
  }

  return centeredIconOverlay;
}

// Minimal LightningJS app displaying a full-screen video behind a UI
const LightningApp: LightningAppFactory = Blits.Application<
  Record<string, never>,
  LightningAppState,
  LightningAppMethods,
  Record<string, never>,
  Record<string, never>
>({
  // Keep the stage dimensions fixed for the TV-only experience.
  state(): LightningAppState {
    return {
      overlayModel: getCenteredIconOverlayModel(),
      stageW: LIGHTNING_APP_WIDTH,
      stageH: LIGHTNING_APP_HEIGHT,
      viewportW: 0,
      viewportH: 0,
      stopViewportSync: null,
    };
  },

  methods: {
    /**
     * @brief Subscribe to viewport updates emitted by the TV bootstrap layout helper
     */
    initializeViewportSync(): void {
      this.stopViewportSync = subscribeToStageLayout(
        (viewportSize: { width: number; height: number }): void => {
          this.viewportW = viewportSize.width;
          this.viewportH = viewportSize.height;
        },
      );
    },

    /**
     * @brief Release the viewport subscription when the Lightning root is destroyed
     */
    tearDownViewportSync(): void {
      if (this.stopViewportSync !== null) {
        this.stopViewportSync();
        this.stopViewportSync = null;
      }
    },
  },

  // Register child components available in the template
  components: {
    Icon,
  },

  // No computed properties for the stage itself

  hooks: {
    /**
     * @brief The application is fully rendered and ready
     *
     * UI lifecycle stays separate from media playback internals.
     */
    ready(): void {
      this.initializeViewportSync();
      lightningPlaybackAdapter.initialize();
      void playExperienceBackground(experience);
    },

    /**
     * @brief Remove app-level listeners when Lightning tears down the root view
     */
    destroy(): void {
      this.tearDownViewportSync();
    },
  },

  // Render the icon component centered on a black canvas
  template: `<Element :w="$stageW" :h="$stageH">
    <Icon
      :overlayModel="$overlayModel"
      :stageW="$stageW"
      :stageH="$stageH"
      :viewportW="$viewportW"
      :viewportH="$viewportH"
    />
  </Element>`,
});

export default LightningApp;
