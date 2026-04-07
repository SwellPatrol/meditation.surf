/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  CenteredIconOverlayModel,
  MeditationExperience,
} from "@meditation-surf/core";
import { BRAND_OVERLAY_ICON_URL } from "@meditation-surf/core/brand/web";

import { applyWebBrandOverlayLayout } from "./brandOverlay";

export type WebAppShell = {
  backgroundVideoElement: HTMLVideoElement;
  overlayIconElement: HTMLImageElement;
};

/**
 * @brief Build the minimal DOM shell used by the web demo surface
 *
 * The shell consumes the shared experience object, while the DOM structure
 * remains local to the web app.
 *
 * @param experience - Shared app scene used to configure the shell
 *
 * @returns DOM elements owned by the web shell
 */
export function createWebAppShell(
  experience: MeditationExperience,
): WebAppShell {
  const appRootElement: HTMLDivElement | null = document.querySelector("#app");

  if (appRootElement === null) {
    throw new Error("Expected the #app root element to exist.");
  }

  const backgroundVideoElement: HTMLVideoElement =
    document.createElement("video");
  backgroundVideoElement.className = "background-video";

  const overlayElement: HTMLDivElement = document.createElement("div");
  overlayElement.className = "overlay";
  overlayElement.setAttribute("aria-hidden", "true");

  const overlayIconModel: CenteredIconOverlayModel | null =
    experience.foregroundUi.getCenteredIconOverlay();

  if (overlayIconModel === null) {
    throw new Error("Expected the demo experience to expose a centered icon.");
  }

  const overlayIconElement: HTMLImageElement = document.createElement("img");
  overlayIconElement.className = "overlay-icon";
  overlayIconElement.alt = "";
  overlayIconElement.dataset.elementId = overlayIconModel.id;
  overlayIconElement.src = BRAND_OVERLAY_ICON_URL;

  overlayElement.appendChild(overlayIconElement);
  appRootElement.append(backgroundVideoElement, overlayElement);

  return {
    backgroundVideoElement,
    overlayIconElement,
  };
}

/**
 * @brief Keep shell-owned DOM layout behavior close to the shell elements it manages
 *
 * @param webAppShell - DOM elements managed by the web shell
 * @param experience - Shared app scene providing icon layout intent
 */
export function applyWebAppShellLayout(
  webAppShell: WebAppShell,
  experience: MeditationExperience,
): void {
  const overlayIconModel: CenteredIconOverlayModel | null =
    experience.foregroundUi.getCenteredIconOverlay();

  if (overlayIconModel === null) {
    return;
  }

  applyWebBrandOverlayLayout(webAppShell.overlayIconElement, overlayIconModel);
}
