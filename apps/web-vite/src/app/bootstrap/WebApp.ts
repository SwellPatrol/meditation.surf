/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MeditationExperience } from "@meditation-surf/core";

import { WebExperienceAdapter } from "../experience/WebExperienceAdapter";
import { WebAppShell } from "../ui/WebAppShell";

/**
 * @brief Top-level lifecycle owner for the web app
 *
 * The app coordinates runtime-specific controllers and keeps the entry module
 * thin, while still consuming the shared meditation experience as its scene.
 */
export class WebApp {
  private readonly experienceAdapter: WebExperienceAdapter;
  private readonly shell: WebAppShell;
  private readonly handleBeforeUnload: () => void;
  private readonly handleResize: () => void;

  /**
   * @brief Assemble the runtime-specific web app around a shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.experienceAdapter = new WebExperienceAdapter(experience);
    this.shell = new WebAppShell(this.experienceAdapter.appLayoutController);
    this.handleBeforeUnload = (): void => {
      void this.experienceAdapter.backgroundVideoController.destroy();
    };
    this.handleResize = (): void => {
      this.experienceAdapter.appLayoutController.applyCenteredOverlayLayout(
        this.shell.centeredOverlayElement,
      );
    };
  }

  /**
   * @brief Start the runtime-specific web app
   *
   * @returns A promise that resolves after startup work has been kicked off
   */
  public async start(): Promise<void> {
    this.experienceAdapter.backgroundVideoController.configureElement(
      this.shell.backgroundVideoElement,
    );
    this.experienceAdapter.appLayoutController.applyCenteredOverlayLayout(
      this.shell.centeredOverlayElement,
    );
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("resize", this.handleResize);
    await this.experienceAdapter.backgroundVideoController.start(
      this.shell.backgroundVideoElement,
    );
  }
}
