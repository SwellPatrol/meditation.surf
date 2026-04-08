/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import {
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
} from "../layout/StageLayout";
import { TvAppLayoutController } from "../layout/TvAppLayoutController";
import { TvViewportSync } from "../layout/TvViewportSync";
import Icon from "./Icon";

// Type alias for the factory returned by Blits.Application
type LightningAppFactory = ReturnType<typeof Blits.Application>;

export type LightningAppOptions = {
  appLayoutController: TvAppLayoutController;
  viewportSync: TvViewportSync;
  onReady: () => void;
  onDestroy: () => void;
};

type LightningAppState = {
  appLayoutController: TvAppLayoutController;
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
 * @brief Build the Lightning root component used by the TV app
 *
 * Rendering remains local to the Lightning app, while startup and shared model
 * adaptation are injected from the TV app layer.
 *
 * @param options - Runtime-specific collaborators owned by the TV app
 *
 * @returns Lightning application factory
 */
export function createLightningApp(
  options: LightningAppOptions,
): LightningAppFactory {
  return Blits.Application<
    Record<string, never>,
    LightningAppState,
    LightningAppMethods,
    Record<string, never>,
    Record<string, never>
  >({
    // Keep the stage dimensions fixed for the TV-only experience.
    state(): LightningAppState {
      return {
        appLayoutController: options.appLayoutController,
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
        this.stopViewportSync = options.viewportSync.subscribe(
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
        options.onReady();
      },

      /**
       * @brief Remove app-level listeners when Lightning tears down the root view
       */
      destroy(): void {
        this.tearDownViewportSync();
        options.onDestroy();
      },
    },

    // Render the icon component centered on a black canvas
    template: `<Element :w="$stageW" :h="$stageH">
      <Icon
        :appLayoutController="$appLayoutController"
        :stageW="$stageW"
        :stageH="$stageH"
        :viewportW="$viewportW"
        :viewportH="$viewportH"
      />
    </Element>`,
  });
}
