/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { getBrandOverlayIconSize } from "./overlay";

// React Native bundles static image assets through module-local `require()`.
// eslint-disable-next-line no-undef
export const BRAND_OVERLAY_ICON_SOURCE: number = require("./icon-1500x1500.png");

export type NativeBrandOverlayImageStyle = {
  width: number;
  height: number;
};

/**
 * @brief Return the runtime-specific image dimensions expected by React Native
 *
 * This converts the shared overlay sizing rules into a native image style.
 *
 * @param availableWidth - Available width for the overlay image
 * @param availableHeight - Available height for the overlay image
 *
 * @returns The React Native image dimensions for the overlay icon
 */
export function getNativeBrandOverlayImageStyle(
  availableWidth: number,
  availableHeight: number,
): NativeBrandOverlayImageStyle {
  const iconSize: number = getBrandOverlayIconSize(
    availableWidth,
    availableHeight,
  );

  return {
    width: iconSize,
    height: iconSize,
  };
}
