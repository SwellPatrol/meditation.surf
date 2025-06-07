/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { Debounce } from "./Debounce";
import { launchLightningApp } from "./LightningApp";

/** How long to wait before applying the final size after a resize */
const RESIZE_DELAY_MS: number = 100;

const resizeDebounce: Debounce = new Debounce(RESIZE_DELAY_MS);

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
  resizeDebounce.run((): void => {
    startApp(window.innerWidth, window.innerHeight);
  });
});

/**
 * Application entry point. Loads global state and launches the LightningJS
 * view.
 */
startApp(window.innerWidth, window.innerHeight);
