/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { WebAppLayoutController } from "./WebAppLayoutController";

/**
 * @brief Own the DOM shell used by the web demo surface
 *
 * The shell is intentionally runtime-specific. It knows how to assemble the
 * DOM nodes that the web app needs, while the shared experience model stays
 * outside the shell itself.
 */
export class WebAppShell {
  public readonly backgroundVideoElement: HTMLVideoElement;
  public readonly centeredOverlayElement: HTMLImageElement;

  private readonly mountElement: HTMLDivElement;

  /**
   * @brief Build the DOM shell for the web app
   *
   * @param appLayoutController - Runtime adapter for the shared app layout
   */
  public constructor(appLayoutController: WebAppLayoutController) {
    this.mountElement = this.getMountElement();
    this.backgroundVideoElement = document.createElement("video");
    this.centeredOverlayElement =
      appLayoutController.createCenteredOverlayElement();
    const foregroundLayerElement: HTMLDivElement =
      appLayoutController.createForegroundLayerElement();

    this.backgroundVideoElement.className = "background-video";
    foregroundLayerElement.appendChild(this.centeredOverlayElement);
    this.mountElement.append(
      this.backgroundVideoElement,
      foregroundLayerElement,
    );
  }

  /**
   * @brief Resolve the root mount element used by the Vite app
   *
   * @returns DOM mount element used for the entire surface
   */
  private getMountElement(): HTMLDivElement {
    const appRootElement: HTMLDivElement | null =
      document.querySelector("#app");

    if (appRootElement === null) {
      throw new Error("Expected the #app root element to exist.");
    }

    return appRootElement;
  }
}
