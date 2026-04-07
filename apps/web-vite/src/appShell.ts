/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { BRAND_OVERLAY_ICON_URL } from "@meditation-surf/core";

export type WebAppShell = {
  backgroundVideoElement: HTMLVideoElement;
  overlayIconElement: HTMLImageElement;
};

/**
 * Build the minimal DOM shell used by the web demo surface.
 */
export function createWebAppShell(): WebAppShell {
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

  const overlayIconElement: HTMLImageElement = document.createElement("img");
  overlayIconElement.className = "overlay-icon";
  overlayIconElement.alt = "";
  overlayIconElement.src = BRAND_OVERLAY_ICON_URL;

  overlayElement.appendChild(overlayIconElement);
  appRootElement.append(backgroundVideoElement, overlayElement);

  return {
    backgroundVideoElement,
    overlayIconElement,
  };
}
