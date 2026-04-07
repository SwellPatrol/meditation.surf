/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import {
  type FittedStageBounds,
  getFittedStageBounds,
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
} from "../layout/stage";
import lightningPlaybackAdapter from "../playback/LightningPlaybackAdapter";
import LightningApp, { TV_STAGE_LAYOUT_EVENT } from "../ui/LightningApp";

/**
 * Launch the app once at a fixed TV resolution and position its canvas.
 */
function startApp(): void {
  const mount: HTMLElement = document.getElementById("app") as HTMLElement;

  mount.style.position = "relative";
  Blits.Launch(LightningApp, mount, {
    w: LIGHTNING_APP_WIDTH,
    h: LIGHTNING_APP_HEIGHT,
  });

  const applyStageLayout: () => void = (): void => {
    const fittedStageBounds: FittedStageBounds = getFittedStageBounds(
      window.innerWidth,
      window.innerHeight,
    );
    const canvas: HTMLCanvasElement | null = mount.querySelector("canvas");

    lightningPlaybackAdapter.setDisplayBounds(
      fittedStageBounds.left,
      fittedStageBounds.top,
      fittedStageBounds.width,
      fittedStageBounds.height,
    );

    if (canvas !== null) {
      canvas.style.position = "absolute";
      canvas.style.top = `${fittedStageBounds.top}px`;
      canvas.style.left = `${fittedStageBounds.left}px`;
      canvas.style.width = `${fittedStageBounds.width}px`;
      canvas.style.height = `${fittedStageBounds.height}px`;
      canvas.style.zIndex = "1";
    }

    window.dispatchEvent(
      new CustomEvent<{
        viewportWidth: number;
        viewportHeight: number;
      }>(TV_STAGE_LAYOUT_EVENT, {
        detail: {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      }),
    );
  };

  window.setTimeout(applyStageLayout, 0);
  window.addEventListener("resize", applyStageLayout);
}

/**
 * Start the app once using the fixed TV layout.
 */
export function launchApp(): void {
  startApp();
}
