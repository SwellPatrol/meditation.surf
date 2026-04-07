/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { DEMO_CENTERED_ICON_OVERLAY } from "../foregroundUi";

export const BRAND_OVERLAY_ICON_ASPECT_RATIO: number =
  DEMO_CENTERED_ICON_OVERLAY.aspectRatio;
export const BRAND_OVERLAY_ICON_MAX_SIZE_PX: number =
  DEMO_CENTERED_ICON_OVERLAY.maxSizePx;
export const BRAND_OVERLAY_ICON_VIEWPORT_RATIO: number =
  DEMO_CENTERED_ICON_OVERLAY.viewportRatio;

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
  return DEMO_CENTERED_ICON_OVERLAY.getIconSize(
    availableWidth,
    availableHeight,
  );
}
