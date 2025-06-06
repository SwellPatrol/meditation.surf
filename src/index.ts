/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import App from "./App";

// Debounce wait period for resize/orientation events in milliseconds
const RESIZE_DEBOUNCE_MS = 100;

// Reference to the timeout used for debouncing resize and orientation events
let resizeTimeout: number | undefined;

function launchApp(): void {
  // Remove any previous content so the stage can be recreated cleanly
  const container = document.getElementById("app");
  if (container) {
    container.innerHTML = "";
  }

  // Launch a new Lightning Blits application sized to the current viewport
  Blits.Launch(App, "app", {
    w: window.innerWidth,
    h: window.innerHeight,
  });
}

function debouncedLaunch(): void {
  // Queue a relaunch after no resize events have fired for a short period
  window.clearTimeout(resizeTimeout);
  resizeTimeout = window.setTimeout(launchApp, RESIZE_DEBOUNCE_MS);
}

// React to browser resize and orientation changes
window.addEventListener("resize", debouncedLaunch);
window.addEventListener("orientationchange", debouncedLaunch);

launchApp();
