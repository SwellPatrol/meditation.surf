/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export type FittedStageBounds = {
  width: number;
  height: number;
  left: number;
  top: number;
};

// Fixed design resolution for a TV-only Lightning experience
export const LIGHTNING_APP_WIDTH: number = 1920;
export const LIGHTNING_APP_HEIGHT: number = 1080;

/**
 * @brief Fit the fixed Lightning stage into the live browser viewport
 *
 * Keep the original TV aspect ratio intact while centering the fitted stage.
 */
export function getFittedStageBounds(
  viewportWidth: number,
  viewportHeight: number,
): FittedStageBounds {
  const widthScale: number = viewportWidth / LIGHTNING_APP_WIDTH;
  const heightScale: number = viewportHeight / LIGHTNING_APP_HEIGHT;
  const scale: number = Math.min(widthScale, heightScale);
  const width: number = LIGHTNING_APP_WIDTH * scale;
  const height: number = LIGHTNING_APP_HEIGHT * scale;
  const left: number = (viewportWidth - width) / 2;
  const top: number = (viewportHeight - height) / 2;

  return {
    width,
    height,
    left,
    top,
  };
}
