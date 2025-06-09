/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/** Time before the brightness button fades out after user interaction. */
const BRIGHTNESS_TIMEOUT_MS: number = 4000;

/** SVG icon for normal brightness. */
const BRIGHTNESS_ON_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1zm0 12a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zm8-5a1 1 0 0 1 1 1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1 1 1 0 0 1 1-1zm-12 1a1 1 0 0 1-1 1H5a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1zm8.95 5.536a1 1 0 1 1 1.414 1.414l-1.414 1.414a1 1 0 0 1-1.414-1.414l1.414-1.414zM6.05 6.464a1 1 0 1 1-1.414-1.414L6.05 3.636a1 1 0 1 1 1.414 1.414L6.05 6.464zm12.9-1.414a1 1 0 0 1-1.414 1.414L16.122 4.05a1 1 0 0 1 1.414-1.414l1.414 1.414zM7.878 19.95a1 1 0 1 1-1.414-1.414l1.414-1.414a1 1 0 0 1 1.414 1.414l-1.414 1.414zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg>';

/** SVG icon for dim brightness. */
const BRIGHTNESS_DIM_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18a6 6 0 1 0 0-12v12z"/></svg>';

/** SVG icon for turning brightness off. */
const BRIGHTNESS_OFF_ICON: string =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16v2H4z"/></svg>';

/** Brightness values corresponding to the icons. */
const BRIGHTNESS_LEVELS: number[] = [1, 0.5, 0];

/**
 * Create and attach a brightness toggle button. The button fades out after a
 * short delay and cycles through three brightness levels when clicked.
 */
export function setupBrightnessButton(): void {
  const button: HTMLButtonElement = document.createElement("button");
  button.id = "brightness-button";
  button.innerHTML = BRIGHTNESS_ON_ICON;
  button.ariaLabel = "Brightness on";

  let levelIndex: number = 0;
  let fadeTimer: number | undefined;

  /** Apply the current brightness to the video element. */
  const applyBrightness = (): void => {
    const videoEl: HTMLVideoElement | null = document.querySelector("video");
    if (videoEl !== null) {
      videoEl.style.filter = `brightness(${BRIGHTNESS_LEVELS[levelIndex]})`;
    }
  };

  /** Show the button and restart the fade-out timer. */
  const showButton = (): void => {
    button.classList.remove("fade-out");
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout((): void => {
      button.classList.add("fade-out");
    }, BRIGHTNESS_TIMEOUT_MS);
  };

  /** Cycle to the next brightness level. */
  const cycleBrightness = (): void => {
    levelIndex = (levelIndex + 1) % BRIGHTNESS_LEVELS.length;
    switch (levelIndex) {
      case 0:
        button.innerHTML = BRIGHTNESS_ON_ICON;
        button.ariaLabel = "Brightness on";
        break;
      case 1:
        button.innerHTML = BRIGHTNESS_DIM_ICON;
        button.ariaLabel = "Brightness dim";
        break;
      default:
        button.innerHTML = BRIGHTNESS_OFF_ICON;
        button.ariaLabel = "Brightness off";
        break;
    }
    applyBrightness();
    showButton();
  };

  button.addEventListener("click", cycleBrightness);
  document.addEventListener("mousemove", showButton);
  document.addEventListener("touchstart", showButton);

  document.body.appendChild(button);
  applyBrightness();
  showButton();
}
