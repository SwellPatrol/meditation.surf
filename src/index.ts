/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { launchLightningApp } from "./LightningApp";

/** Milliseconds to wait before applying the final size after a resize */
const COOL_DOWN_MS: number = 100;

let coolDownTimer: number | undefined;
let lastWidth: number = window.innerWidth;
let lastHeight: number = window.innerHeight;

/** Launch the app, replacing any existing canvas */
function startApp(width: number, height: number): void {
  const mount: HTMLElement = document.getElementById("app") as HTMLElement;
  const oldCanvas: HTMLCanvasElement | null = mount.querySelector("canvas");

  // Launch the new LightningJS canvas before removing the old one to minimize
  // the time the screen goes blank during a resize
  launchLightningApp(width, height);

  if (oldCanvas !== null) {
    oldCanvas.remove();
  }
}

window.addEventListener("resize", (): void => {
  lastWidth = window.innerWidth;
  lastHeight = window.innerHeight;

  // Apply the new resolution immediately if we're not in the cooldown period
  if (coolDownTimer === undefined) {
    startApp(lastWidth, lastHeight);
  }

  // Restart the cooldown timer to apply the last resolution after the cooldown
  window.clearTimeout(coolDownTimer);
  coolDownTimer = window.setTimeout((): void => {
    startApp(lastWidth, lastHeight);
    coolDownTimer = undefined;
  }, COOL_DOWN_MS);
});

/**
 * Application entry point. Loads global state and launches the LightningJS
 * view.
 */
startApp(window.innerWidth, window.innerHeight);
