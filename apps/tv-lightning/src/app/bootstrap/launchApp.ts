/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import Blits from "@lightningjs/blits";

import {
  applyCanvasStageLayout,
  dispatchStageLayoutEvent,
  type FittedStageBounds,
  getFittedStageBounds,
  getViewportSize,
  LIGHTNING_APP_HEIGHT,
  LIGHTNING_APP_WIDTH,
} from "../layout/stage";
import lightningPlaybackAdapter from "../playback/LightningPlaybackAdapter";
import LightningApp from "../ui/LightningApp";

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
    const viewportSize: {
      width: number;
      height: number;
    } = getViewportSize();
    const fittedStageBounds: FittedStageBounds = getFittedStageBounds(
      viewportSize.width,
      viewportSize.height,
    );
    const canvas: HTMLCanvasElement | null = mount.querySelector("canvas");

    lightningPlaybackAdapter.setDisplayBounds(
      fittedStageBounds.left,
      fittedStageBounds.top,
      fittedStageBounds.width,
      fittedStageBounds.height,
    );

    if (canvas !== null) {
      applyCanvasStageLayout(canvas, fittedStageBounds);
    }

    dispatchStageLayoutEvent();
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
