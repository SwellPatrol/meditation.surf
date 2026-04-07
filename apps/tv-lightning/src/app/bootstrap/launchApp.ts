/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import {
  initializeStageLayout,
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
} from "../layout/stage";
import lightningPlaybackAdapter from "../playback/LightningPlaybackAdapter";
import LightningApp from "../ui/LightningApp";

/**
 * @brief Launch the app once at a fixed TV resolution and position its canvas
 */
function startApp(): void {
  const mount: HTMLElement = document.getElementById("app") as HTMLElement;

  mount.style.position = "relative";
  Blits.Launch(LightningApp, mount, {
    w: LIGHTNING_APP_WIDTH,
    h: LIGHTNING_APP_HEIGHT,
  });

  initializeStageLayout(mount, (fittedStageBounds): void => {
    lightningPlaybackAdapter.setDisplayBounds(
      fittedStageBounds.left,
      fittedStageBounds.top,
      fittedStageBounds.width,
      fittedStageBounds.height,
    );
  });
}

/**
 * @brief Start the app once using the fixed TV layout
 */
export function launchApp(): void {
  startApp();
}
