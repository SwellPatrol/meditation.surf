/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MeditationExperience } from "@meditation-surf/core";

import { WebAppShell } from "./WebAppShell";
import { WebBackgroundVideoController } from "./WebBackgroundVideoController";
import { WebForegroundUiController } from "./WebForegroundUiController";

/**
 * @brief Top-level lifecycle owner for the web app
 *
 * The app coordinates runtime-specific controllers and keeps the entry module
 * thin, while still consuming the shared meditation experience as its scene.
 */
export class WebApp {
  private readonly shell: WebAppShell;
  private readonly backgroundVideoController: WebBackgroundVideoController;
  private readonly foregroundUiController: WebForegroundUiController;
  private readonly handleBeforeUnload: () => void;
  private readonly handleResize: () => void;

  /**
   * @brief Assemble the runtime-specific web app around a shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.foregroundUiController = new WebForegroundUiController(experience);
    this.backgroundVideoController = new WebBackgroundVideoController(
      experience,
    );
    this.shell = new WebAppShell(this.foregroundUiController);
    this.handleBeforeUnload = (): void => {
      void this.backgroundVideoController.destroy();
    };
    this.handleResize = (): void => {
      this.foregroundUiController.applyLayout(this.shell.overlayIconElement);
    };
  }

  /**
   * @brief Start the runtime-specific web app
   *
   * @returns A promise that resolves after startup work has been kicked off
   */
  public async start(): Promise<void> {
    this.backgroundVideoController.configureElement(
      this.shell.backgroundVideoElement,
    );
    this.foregroundUiController.applyLayout(this.shell.overlayIconElement);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("resize", this.handleResize);
    await this.backgroundVideoController.start(
      this.shell.backgroundVideoElement,
    );
  }
}
