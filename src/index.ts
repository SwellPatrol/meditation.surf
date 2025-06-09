/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { launchApp } from "./app/launchApp";
import { getVideoManager, VideoManager } from "./player/VideoManager";
import { PLAYLIST } from "./playlist";
import { setupBrightnessButton } from "./utils/brightness";
import { setupFullscreenButton } from "./utils/fullscreen";
import { setupVolumeButton } from "./utils/volume";

// Application entry point
launchApp();
setupFullscreenButton();
setupBrightnessButton();
setupVolumeButton();

const manager: VideoManager = getVideoManager();

const backgroundContainer: HTMLElement = document.getElementById(
  "background-container",
) as HTMLElement;
const overlayContainer: HTMLElement = document.getElementById(
  "overlay-container",
) as HTMLElement;

/** Position the overlay container in the lower-right quarter. */
const updateLayout = (): void => {
  const width: number = window.innerWidth / 2;
  const height: number = window.innerHeight / 2;
  overlayContainer.style.width = `${width}px`;
  overlayContainer.style.height = `${height}px`;
  overlayContainer.style.left = `${window.innerWidth - width}px`;
  overlayContainer.style.top = `${window.innerHeight - height}px`;
};

window.addEventListener("resize", updateLayout);
updateLayout();

let index: number = 0;
manager.play(PLAYLIST[index], backgroundContainer);
window.setInterval((): void => {
  index = (index + 1) % PLAYLIST.length;
  const container: HTMLElement =
    index === 0 ? backgroundContainer : overlayContainer;
  void manager.play(PLAYLIST[index], container);
}, 5000);
