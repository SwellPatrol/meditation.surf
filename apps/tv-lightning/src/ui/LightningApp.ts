/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import type { OverlayController, OverlayState } from "@meditation-surf/core";
import type {
  PlaybackVisualReadinessController,
  PlaybackVisualReadinessState,
} from "@meditation-surf/player-core";

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
  overlayController: OverlayController;
  playbackVisualReadinessController: PlaybackVisualReadinessController;
  viewportSync: TvViewportSync;
  onReady: () => void;
  onDestroy: () => void;
};

type LightningAppState = {
  appLayoutController: TvAppLayoutController;
  fadeDurationMs: number;
  loadingAlpha: number;
  overlayAlpha: number;
  stageW: number;
  stageH: number;
  viewportW: number;
  viewportH: number;
  removeLoadingSubscription: (() => void) | null;
  removeOverlaySubscription: (() => void) | null;
  stopViewportSync: (() => void) | null;
};

type LightningAppMethods = {
  initializeLoadingSubscription(): void;
  initializeOverlaySubscription(): void;
  initializeViewportSync(): void;
  handlePlaybackVisualReadinessState(
    playbackVisualReadinessState: PlaybackVisualReadinessState,
  ): void;
  handleOverlayState(overlayState: OverlayState): void;
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
        fadeDurationMs: options.overlayController.getConfig().fadeDurationMs,
        loadingAlpha: 1,
        overlayAlpha: 0,
        stageW: LIGHTNING_APP_WIDTH,
        stageH: LIGHTNING_APP_HEIGHT,
        viewportW: 0,
        viewportH: 0,
        removeLoadingSubscription: null,
        removeOverlaySubscription: null,
        stopViewportSync: null,
      };
    },

    methods: {
      /**
       * @brief Subscribe the Lightning root to playback visual readiness
       */
      initializeLoadingSubscription(): void {
        this.removeLoadingSubscription =
          options.playbackVisualReadinessController.subscribe(
            (
              playbackVisualReadinessState: PlaybackVisualReadinessState,
            ): void => {
              this.handlePlaybackVisualReadinessState(
                playbackVisualReadinessState,
              );
            },
          );
      },

      /**
       * @brief Subscribe the Lightning root to the shared overlay state
       */
      initializeOverlaySubscription(): void {
        this.removeOverlaySubscription = options.overlayController.subscribe(
          (overlayState: OverlayState): void => {
            this.handleOverlayState(overlayState);
          },
        );
      },

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
       * @brief Map playback visual readiness onto the loading icon alpha
       *
       * @param playbackVisualReadinessState - Shared playback readiness snapshot
       */
      handlePlaybackVisualReadinessState(
        playbackVisualReadinessState: PlaybackVisualReadinessState,
      ): void {
        this.loadingAlpha =
          playbackVisualReadinessState.readiness === "loading" ? 1 : 0;
      },

      /**
       * @brief Map shared overlay visibility onto Lightning alpha
       *
       * @param overlayState - Shared overlay visibility snapshot
       */
      handleOverlayState(overlayState: OverlayState): void {
        this.overlayAlpha = overlayState.visibility === "visible" ? 1 : 0;
      },

      /**
       * @brief Release the viewport subscription when the Lightning root is destroyed
       */
      tearDownViewportSync(): void {
        if (this.removeLoadingSubscription !== null) {
          this.removeLoadingSubscription();
          this.removeLoadingSubscription = null;
        }

        if (this.stopViewportSync !== null) {
          this.stopViewportSync();
          this.stopViewportSync = null;
        }

        if (this.removeOverlaySubscription !== null) {
          this.removeOverlaySubscription();
          this.removeOverlaySubscription = null;
        }
      },
    },

    input: {
      /**
       * @brief Route TV remote enter presses into the shared overlay controller
       */
      enter(): void {
        options.overlayController.dispatch("INTERACT");
      },

      /**
       * @brief Treat space like a select action in browser-hosted TV development
       */
      space(): void {
        options.overlayController.dispatch("INTERACT");
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
        this.initializeLoadingSubscription();
        this.initializeOverlaySubscription();
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
        :alpha="$loadingAlpha"
        :fadeDurationMs="$fadeDurationMs"
        :stageW="$stageW"
        :stageH="$stageH"
        :viewportW="$viewportW"
        :viewportH="$viewportH"
      />
      <Icon
        :appLayoutController="$appLayoutController"
        :alpha="$overlayAlpha"
        :fadeDurationMs="$fadeDurationMs"
        :stageW="$stageW"
        :stageH="$stageH"
        :viewportW="$viewportW"
        :viewportH="$viewportH"
      />
    </Element>`,
  });
}
