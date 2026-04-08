/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";
import type { MeditationExperience } from "@meditation-surf/core";

import { TvExperienceAdapter } from "../experience/TvExperienceAdapter";
import {
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
} from "../layout/StageLayout";
import { TvViewportSync } from "../layout/TvViewportSync";
import { createLightningApp } from "../ui/LightningApp";

/**
 * @brief Top-level lifecycle owner for the TV Lightning app
 *
 * The TV app coordinates Lightning bootstrapping, viewport syncing, and
 * runtime-specific adaptation of the shared meditation experience.
 */
export class TvApp {
  private readonly experienceAdapter: TvExperienceAdapter;
  private readonly viewportSync: TvViewportSync;
  private readonly handleBeforeUnload: () => void;

  /**
   * @brief Build the TV app around a shared meditation experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.experienceAdapter = new TvExperienceAdapter(experience);
    this.viewportSync = new TvViewportSync();
    this.handleBeforeUnload = (): void => {
      void this.experienceAdapter.backgroundVideoController.destroy();
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
        appLayoutController: this.experienceAdapter.appLayoutController,
        overlayTitle: this.experienceAdapter.overlayTitle,
        overlayController: this.experienceAdapter.overlayController,
        playbackVisualReadinessController:
          this.experienceAdapter.playbackVisualReadinessController,
        viewportSync: this.viewportSync,
        onReady: (): void => {
          this.experienceAdapter.backgroundVideoController.initialize();
          void this.experienceAdapter.backgroundVideoController.start();
        },
        onDestroy: (): void => {
          void this.experienceAdapter.backgroundVideoController.destroy();
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
        this.experienceAdapter.backgroundVideoController.setDisplayBounds(
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
