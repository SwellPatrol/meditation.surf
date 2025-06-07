/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import LightningApp from "./LightningApp";
import { debounce } from "./utils/debounce";

/**
 * Launch the LightningJS application sized to the current viewport.
 */
function launchLightningApp(width: number, height: number): void {
  Blits.Launch(LightningApp, "app", {
    w: width,
    h: height,
  });
}

/** Milliseconds to wait before applying the final size after a resize */
const COOL_DOWN_MS: number = 100;

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

/** Start the app and watch for window size changes */
export function launchApp(): void {
  const debouncedStartApp: (...errArgs: Parameters<typeof startApp>) => void =
    debounce(startApp, COOL_DOWN_MS);

  window.addEventListener("resize", (): void => {
    debouncedStartApp(window.innerWidth, window.innerHeight);
  });

  startApp(window.innerWidth, window.innerHeight);
}
