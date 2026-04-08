/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import type { MeditationExperience } from "@meditation-surf/core";

import {
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
} from "../layout/StageLayout";
import { TvViewportSync } from "../layout/TvViewportSync";
import lightningPlaybackAdapter from "../playback/LightningPlaybackAdapter";
import { TvBackgroundVideoController } from "../playback/TvBackgroundVideoController";
import { createLightningApp } from "../ui/LightningApp";
import { TvAppLayoutController } from "../ui/TvAppLayoutController";

/**
 * @brief Top-level lifecycle owner for the TV Lightning app
 *
 * The TV app coordinates Lightning bootstrapping, viewport syncing, and
 * runtime-specific adaptation of the shared meditation experience.
 */
export class TvApp {
  private readonly backgroundVideoController: TvBackgroundVideoController;
  private readonly appLayoutController: TvAppLayoutController;
  private readonly viewportSync: TvViewportSync;
  private readonly handleBeforeUnload: () => void;

  /**
   * @brief Build the TV app around a shared meditation experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.backgroundVideoController = new TvBackgroundVideoController(
      experience,
      experience.appLayout.getBackgroundLayer(),
      lightningPlaybackAdapter,
    );
    this.appLayoutController = new TvAppLayoutController(experience.appLayout);
    this.viewportSync = new TvViewportSync();
    this.handleBeforeUnload = (): void => {
      void this.backgroundVideoController.destroy();
      this.viewportSync.destroy();
    };
  }

  /**
   * @brief Launch the Lightning app and connect runtime-specific controllers
   */
  public start(): void {
    const mountElement: HTMLElement = this.getMountElement();
    const lightningApp: ReturnType<typeof Blits.Application> =
      createLightningApp({
        appLayoutController: this.appLayoutController,
        viewportSync: this.viewportSync,
        onReady: (): void => {
          this.backgroundVideoController.initialize();
          void this.backgroundVideoController.start();
        },
        onDestroy: (): void => {
          void this.backgroundVideoController.destroy();
          this.viewportSync.destroy();
        },
      });

    mountElement.style.position = "relative";
    Blits.Launch(lightningApp, mountElement, {
      w: LIGHTNING_APP_WIDTH,
      h: LIGHTNING_APP_HEIGHT,
    });

    this.viewportSync.start(
      mountElement,
      (left: number, top: number, width: number, height: number): void => {
        this.backgroundVideoController.setDisplayBounds(
          left,
          top,
          width,
          height,
        );
      },
    );
    window.addEventListener("beforeunload", this.handleBeforeUnload);
  }

  /**
   * @brief Resolve the DOM mount used by the Lightning runtime
   *
   * @returns Root DOM mount for the TV app
   */
  private getMountElement(): HTMLElement {
    const mountElement: HTMLElement | null = document.getElementById("app");

    if (mountElement === null) {
      throw new Error("Expected the #app root element to exist.");
    }

    return mountElement;
  }
}
