/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import {
  type AppCatalog,
  type CatalogCategory,
  DemoCatalogClient,
  type MediaContent,
} from "@meditation-surf/core";

import AudioToggle from "../../components/audio/AudioToggle";
import Icon from "../../components/common/Icon";
import lightningPlaybackController from "../playback/LightningPlaybackController";

// Type alias for the factory returned by Blits.Application
type LightningAppFactory = ReturnType<typeof Blits.Application>;

// Fixed design resolution for a TV-only Lightning experience
export const LIGHTNING_APP_WIDTH: number = 1920;
export const LIGHTNING_APP_HEIGHT: number = 1080;
const catalogClient: DemoCatalogClient = new DemoCatalogClient();

/**
 * Load the shared demo catalog and start the featured item.
 * The TV app stays responsible for presentation and playback timing.
 */
async function playFeaturedContent(): Promise<void> {
  const catalog: AppCatalog = await catalogClient.getCatalog();
  const featuredCategory: CatalogCategory | undefined = catalog.categories[0];
  const featuredItem: MediaContent | undefined = featuredCategory?.items[0];

  if (featuredItem === undefined) {
    return;
  }

  await lightningPlaybackController.load(featuredItem.playbackSource);
  await lightningPlaybackController.play();
}

// Minimal LightningJS app displaying a full-screen video behind a UI
const LightningApp: LightningAppFactory = Blits.Application({
  // Keep the stage dimensions fixed for the TV-only experience.
  state(): { stageW: number; stageH: number } {
    return {
      stageW: LIGHTNING_APP_WIDTH,
      stageH: LIGHTNING_APP_HEIGHT,
    };
  },

  // No custom methods for the stage itself

  // Register child components available in the template
  components: {
    Icon,
    AudioToggle,
  },

  // No computed properties for the stage itself

  hooks: {
    /**
     * The application is fully rendered and ready.
     * UI lifecycle stays separate from media playback internals.
     */
    ready(): void {
      lightningPlaybackController.setDisplayBounds(
        0,
        0,
        LIGHTNING_APP_WIDTH,
        LIGHTNING_APP_HEIGHT,
      );
      lightningPlaybackController.initialize();
      void playFeaturedContent();
    },
  },

  // Render the icon component centered on a black canvas
  template: `<Element :w="$stageW" :h="$stageH">
    <Icon :stageW="$stageW" :stageH="$stageH" />
    <AudioToggle :stageW="$stageW" :stageH="$stageH" />
  </Element>`,
});

export default LightningApp;
