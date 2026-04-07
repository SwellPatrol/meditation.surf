/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import {
  type AppCatalog,
  type CatalogCategory,
  type CatalogClient,
  DemoCatalogClient,
  type MediaContent,
} from "@meditation-surf/core";

import Icon from "../../components/common/Icon";
import {
  getViewportSize,
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
  type StageLayoutEventDetail,
  TV_STAGE_LAYOUT_EVENT,
} from "../layout/stage";
import lightningPlaybackAdapter from "../playback/LightningPlaybackAdapter";

// Type alias for the factory returned by Blits.Application
type LightningAppFactory = ReturnType<typeof Blits.Application>;
const catalogClient: CatalogClient = new DemoCatalogClient();

type LightningAppState = {
  stageW: number;
  stageH: number;
  viewportW: number;
  viewportH: number;
};

type LightningAppMethods = {
  applyViewportSize(viewportWidth: number, viewportHeight: number): void;
  syncViewportSize(): void;
  handleStageLayout(event: Event): void;
};

/**
 * Load the shared catalog and start the featured item.
 * Lightning still owns TV-specific presentation and playback timing.
 */
async function playFeaturedContent(): Promise<void> {
  const catalog: AppCatalog = await catalogClient.getCatalog();
  const featuredCategory: CatalogCategory | undefined = catalog.categories[0];
  const featuredItem: MediaContent | undefined = featuredCategory?.items[0];

  if (featuredItem === undefined) {
    return;
  }

  await lightningPlaybackAdapter.load(featuredItem.playbackSource);
  await lightningPlaybackAdapter.play();
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
      stageW: LIGHTNING_APP_WIDTH,
      stageH: LIGHTNING_APP_HEIGHT,
      viewportW: getViewportSize().width,
      viewportH: getViewportSize().height,
    };
  },

  methods: {
    /**
     * Store the live browser viewport separately from the fixed Lightning
     * stage so TV shares the same overlay sizing inputs as web and mobile.
     */
    applyViewportSize(viewportWidth: number, viewportHeight: number): void {
      this.viewportW = viewportWidth;
      this.viewportH = viewportHeight;
    },

    /**
     * Mirror the live viewport dimensions currently visible in the browser.
     * This keeps initial render state aligned even before the bootstrap
     * resize callback dispatches its first layout event.
     */
    syncViewportSize(): void {
      const viewportSize: { width: number; height: number } = getViewportSize();

      this.applyViewportSize(viewportSize.width, viewportSize.height);
    },

    /**
     * Accept viewport updates from the bootstrap layer whenever the fitted TV
     * canvas is re-laid out.
     */
    handleStageLayout(event: Event): void {
      const stageLayoutEvent: CustomEvent<StageLayoutEventDetail> =
        event as CustomEvent<StageLayoutEventDetail>;

      this.applyViewportSize(
        stageLayoutEvent.detail.viewportWidth,
        stageLayoutEvent.detail.viewportHeight,
      );
    },
  },

  // Register child components available in the template
  components: {
    Icon,
  },

  // No computed properties for the stage itself

  hooks: {
    /**
     * The application is fully rendered and ready.
     * UI lifecycle stays separate from media playback internals.
     */
    ready(): void {
      this.syncViewportSize();
      window.addEventListener(TV_STAGE_LAYOUT_EVENT, this.handleStageLayout);
      lightningPlaybackAdapter.initialize();
      void playFeaturedContent();
    },

    /**
     * Remove app-level listeners when Lightning tears down the root view.
     */
    destroy(): void {
      window.removeEventListener(TV_STAGE_LAYOUT_EVENT, this.handleStageLayout);
    },
  },

  // Render the icon component centered on a black canvas
  template: `<Element :w="$stageW" :h="$stageH">
    <Icon
      :stageW="$stageW"
      :stageH="$stageH"
      :viewportW="$viewportW"
      :viewportH="$viewportH"
    />
  </Element>`,
});

export default LightningApp;
