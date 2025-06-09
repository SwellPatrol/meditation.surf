/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { launchApp } from "./app/launchApp";
import { PLAYLIST } from "./playlist";
import { setupBrightnessButton } from "./utils/brightness";
import { setupFullscreenButton } from "./utils/fullscreen";
import { setupVolumeButton } from "./utils/volume";

// Application entry point
launchApp();
setupFullscreenButton();
setupBrightnessButton();
setupVolumeButton();

// Assign playlist sources to video elements
const videos: NodeListOf<HTMLVideoElement> = document.querySelectorAll("video");
videos.forEach((videoEl: HTMLVideoElement, index: number): void => {
  const url: string | undefined = PLAYLIST[index];
  if (url !== undefined) {
    videoEl.src = url;
  }
});
