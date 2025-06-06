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

/**
 * Resize the Lightning renderer's canvas to match the viewport.
 * The Lightning application itself listens for resize events and
 * adjusts its stage size, so here we only need to update the DOM
 * canvas element.
 */
function resizeCanvas(): void {
  const canvas: HTMLCanvasElement | null =
    document.querySelector("#app canvas");

  if (canvas !== null) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

window.addEventListener("resize", (): void => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(resizeCanvas, DEBOUNCE_MS);
});

/**
 * Application entry point. Launch the LightningJS view and size the canvas to
 * the current viewport.
 */
launchLightningApp();
resizeCanvas();
