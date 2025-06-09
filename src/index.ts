/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { launchApp } from "./app/launchApp";
import { getVideoManager, VideoManager } from "./player/VideoManager";
import { setupBrightnessButton } from "./utils/brightness";
import { setupFullscreenButton } from "./utils/fullscreen";
import { setupVolumeButton } from "./utils/volume";

// Application entry point
launchApp();
setupFullscreenButton();
setupBrightnessButton();
setupVolumeButton();

const manager: VideoManager = getVideoManager();

// Demonstrate pausing and resuming videos.
manager.play(0).then((): void => {
  window.setTimeout((): void => {
    manager.play(1).then((): void => {
      window.setTimeout((): void => {
        manager.play(0);
      }, 5000);
    });
  }, 5000);
});
