/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import App from "./App";

//------------------------------------------------------------
// Application size management
//------------------------------------------------------------

// Debounce wait period for resize/orientation events in milliseconds
export const RESIZE_DEBOUNCE_MS: number = 100;

// Identifier returned by setTimeout for the pending relaunch
let resizeTimeout: number | undefined;

// Start the Lightning application sized to the current viewport
function launchApp(): void {
  const container: HTMLElement | null = document.getElementById("app");
  if (container) {
    container.innerHTML = "";
  }

  Blits.Launch(App, "app", {
    w: window.innerWidth,
    h: window.innerHeight,
  });
}

// Relaunch the app after resize/orientation events settle
function debouncedLaunch(): void {
  window.clearTimeout(resizeTimeout);
  resizeTimeout = window.setTimeout(launchApp, RESIZE_DEBOUNCE_MS);
}

// Set up event handlers and launch the application
export function startApp(): void {
  window.addEventListener("resize", debouncedLaunch);
  window.addEventListener("orientationchange", debouncedLaunch);

  launchApp();
}
