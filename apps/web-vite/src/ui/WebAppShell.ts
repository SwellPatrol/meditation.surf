/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { WebAppLayoutController } from "../layout/WebAppLayoutController";

/**
 * @brief Own the DOM shell used by the web demo surface
 *
 * The shell is intentionally runtime-specific. It knows how to assemble the
 * DOM nodes that the web app needs, while the shared experience model stays
 * outside the shell itself.
 */
export class WebAppShell {
  public readonly backgroundVideoElement: HTMLVideoElement;
  public readonly fullscreenInteractionElement: HTMLButtonElement;
  public readonly loadingOverlayElement: HTMLImageElement;
  public readonly overlayUiElement: HTMLImageElement;
  public readonly mountElement: HTMLDivElement;

  /**
   * @brief Build the DOM shell for the web app
   *
   * @param appLayoutController - Runtime adapter for the shared app layout
   */
  public constructor(appLayoutController: WebAppLayoutController) {
    this.mountElement = this.getMountElement();
    this.backgroundVideoElement = document.createElement("video");
    this.fullscreenInteractionElement = document.createElement("button");
    this.loadingOverlayElement =
      appLayoutController.createCenteredOverlayElement();
    this.overlayUiElement = appLayoutController.createCenteredOverlayElement();
    const loadingPlaneElement: HTMLDivElement =
      this.createOverlayPlaneElement("loading-plane");
    const overlayUiPlaneElement: HTMLDivElement =
      this.createOverlayPlaneElement("overlay-ui-plane");

    this.backgroundVideoElement.className = "background-video";
    this.fullscreenInteractionElement.className = "interaction-surface";
    this.fullscreenInteractionElement.type = "button";
    this.fullscreenInteractionElement.setAttribute(
      "aria-label",
      "Show overlay controls",
    );
    this.loadingOverlayElement.classList.add("loading-icon");

    /**
     * @brief Prime both overlay planes with the shared centered sizing
     *
     * The loading plane is visible immediately, so its icon must receive its
     * initial width and height before the first paint. The overlay UI plane is
     * sized here as well so both planes start from the same shared geometry.
     */
    appLayoutController.applyCenteredOverlayLayout(this.loadingOverlayElement);
    appLayoutController.applyCenteredOverlayLayout(this.overlayUiElement);
    loadingPlaneElement.append(this.loadingOverlayElement);
    overlayUiPlaneElement.append(this.overlayUiElement);
    this.mountElement.append(
      this.backgroundVideoElement,
      this.fullscreenInteractionElement,
      loadingPlaneElement,
      overlayUiPlaneElement,
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

  /**
   * @brief Create a fullscreen plane that centers a single overlay icon
   *
   * @param className - Plane-specific CSS class name
   *
   * @returns DOM element that centers its child across the viewport
   */
  private createOverlayPlaneElement(className: string): HTMLDivElement {
    const overlayPlaneElement: HTMLDivElement = document.createElement("div");

    overlayPlaneElement.className = className;
    overlayPlaneElement.setAttribute("aria-hidden", "true");

    return overlayPlaneElement;
  }
}
