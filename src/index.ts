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

/** Currently active Lightning application container. */
let activeContainer: HTMLElement | null = null;

/** Timer identifier for the resize debounce logic. */
let resizeTimer: number | undefined;

/**
 * Create a DOM element that will host the Lightning canvas.
 */
function createContainer(): HTMLDivElement {
  const container: HTMLDivElement = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.position = "absolute";
  container.style.top = "0";
  container.style.left = "0";
  return container;
}

/**
 * Launch a new Lightning application and remove the previous one
 * after the new canvas signals readiness.
 */
function relaunchApp(): void {
  const parent: HTMLElement = document.getElementById("app") as HTMLElement;
  const oldContainer: HTMLElement | null = activeContainer;
  const newContainer: HTMLDivElement = createContainer();
  parent.appendChild(newContainer);
  launchLightningApp(newContainer);

  const onReady: () => void = (): void => {
    window.removeEventListener("lightningReady", onReady);
    if (oldContainer !== null) {
      oldContainer.remove();
    }
    activeContainer = newContainer;
  };

  window.addEventListener("lightningReady", onReady);
}

window.addEventListener("resize", (): void => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(relaunchApp, DEBOUNCE_MS);
});

/**
 * Application entry point. Loads global state and launches the LightningJS
 * view.
 */
// Launch the initial application
((): void => {
  const parent: HTMLElement = document.getElementById("app") as HTMLElement;
  activeContainer = createContainer();
  parent.appendChild(activeContainer);
  launchLightningApp(activeContainer);
})();
