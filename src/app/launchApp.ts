/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import LightningApp from "./LightningApp";

/**
 * Launch the LightningJS application sized to the current viewport.
 */
function launchLightningApp(width: number, height: number): void {
  Blits.Launch(LightningApp, "app", {
    w: width,
    h: height,
  });
}

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

/** Start the app sized to the current viewport */
export function launchApp(): void {
  startApp(window.innerWidth, window.innerHeight);
}
