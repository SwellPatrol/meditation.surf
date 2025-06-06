/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { launchLightningApp } from "./LightningApp";

/** Milliseconds to debounce window resize events. */
const DEBOUNCE_MS: number = 200;

let resizeTimer: number | undefined;

/** Launch the app, replacing any existing canvas. */
function startApp(): void {
  const mount: HTMLElement = document.getElementById("app") as HTMLElement;
  const oldCanvas: HTMLCanvasElement | null = mount.querySelector("canvas");

  // Launch the new LightningJS canvas before removing the old one to
  // ensure the screen never goes blank during a resize.
  launchLightningApp();

  if (oldCanvas !== null) {
    oldCanvas.remove();
  }
}

window.addEventListener("resize", (): void => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(startApp, DEBOUNCE_MS);
});

/**
 * Application entry point. Loads global state and launches the LightningJS
 * view.
 */
startApp();
