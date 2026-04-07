/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export const BRAND_OVERLAY_ICON_ASPECT_RATIO: number = 1;
export const BRAND_OVERLAY_ICON_MAX_SIZE_PX: number = 240;
export const BRAND_OVERLAY_ICON_VIEWPORT_RATIO: number = 0.32;

/**
 * @brief Keep the shared overlay icon square and modestly sized across runtimes
 *
 * Each app remains responsible for centering and rendering the asset.
 *
 * @param availableWidth - Available width for the overlay region
 * @param availableHeight - Available height for the overlay region
 *
 * @returns The icon size in pixels after applying shared sizing limits
 */
export function getBrandOverlayIconSize(
  availableWidth: number,
  availableHeight: number,
): number {
  const smallerDimension: number = Math.min(availableWidth, availableHeight);
  const scaledSize: number =
    smallerDimension * BRAND_OVERLAY_ICON_VIEWPORT_RATIO;

  return Math.min(scaledSize, BRAND_OVERLAY_ICON_MAX_SIZE_PX);
}
