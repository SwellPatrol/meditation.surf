/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  CenteredOverlayLayout,
  MeditationExperience,
} from "@meditation-surf/core";
import { BRAND_OVERLAY_ICON_URL } from "@meditation-surf/core/brand/web";

import { WebBrandOverlay } from "./WebBrandOverlay";

/**
 * @brief Adapt the shared foreground UI model into DOM-owned overlay elements
 *
 * The web app keeps DOM rendering local, while this controller owns how the
 * shared foreground UI scene maps onto those elements.
 */
export class WebForegroundUiController {
  private readonly experience: MeditationExperience;
  private readonly brandOverlay: WebBrandOverlay;

  /**
   * @brief Capture the shared experience consumed by the web foreground UI
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    this.experience = experience;
    this.brandOverlay = new WebBrandOverlay();
  }

  /**
   * @brief Create the centered icon element required by the current product surface
   *
   * @returns DOM image element representing the centered icon overlay
   */
  public createOverlayIconElement(): HTMLImageElement {
    const overlayIconModel: CenteredOverlayLayout =
      this.getCenteredIconOverlayModel();
    const overlayIconElement: HTMLImageElement = document.createElement("img");

    overlayIconElement.className = "overlay-icon";
    overlayIconElement.alt = "";
    overlayIconElement.dataset.elementId = overlayIconModel.id;
    overlayIconElement.src = BRAND_OVERLAY_ICON_URL;

    return overlayIconElement;
  }

  /**
   * @brief Apply the shared layout intent to the web overlay icon element
   *
   * @param overlayIconElement - DOM image element rendered above the video
   */
  public applyLayout(overlayIconElement: HTMLImageElement): void {
    const overlayIconModel: CenteredOverlayLayout =
      this.getCenteredIconOverlayModel();

    this.brandOverlay.applyLayout(overlayIconElement, overlayIconModel);
  }

  /**
   * @brief Resolve the centered icon overlay required by the current experience
   *
   * @returns Shared centered icon overlay model
   */
  private getCenteredIconOverlayModel(): CenteredOverlayLayout {
    const overlayIconModel: CenteredOverlayLayout | null =
      this.experience.appLayout.getForegroundLayer().getCenteredOverlay();

    if (overlayIconModel === null) {
      throw new Error(
        "Expected the demo app layout to expose a centered overlay.",
      );
    }

    return overlayIconModel;
  }
}
