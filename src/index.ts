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

  /** Remove the previous canvas once the new one is rendered. */
  const handleReady: () => void = (): void => {
    if (oldCanvas !== null) {
      oldCanvas.remove();
    }
    window.removeEventListener("lightningReady", handleReady);
  };

  window.addEventListener("lightningReady", handleReady);

  // Launch the new canvas. The old one remains until the ready event fires.
  launchLightningApp();
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
