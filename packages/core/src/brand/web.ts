/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { getBrandOverlayIconSize } from "./overlay";

export const BRAND_OVERLAY_ICON_URL: string = new URL(
  "./icon-1500x1500.png",
  import.meta.url,
).href;

/**
 * Apply the shared brand overlay size to a web image element.
 */
export function applyBrandOverlayImageSize(
  imageElement: HTMLImageElement,
  availableWidth: number,
  availableHeight: number,
): void {
  const iconSize: number = getBrandOverlayIconSize(
    availableWidth,
    availableHeight,
  );

  imageElement.style.width = `${iconSize}px`;
  imageElement.style.height = `${iconSize}px`;
}
