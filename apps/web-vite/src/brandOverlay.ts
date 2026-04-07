/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { applyBrandOverlayImageSize } from "@meditation-surf/core";

/**
 * Keep the overlay icon centered and sized from the shared viewport policy.
 */
export function applyWebBrandOverlayLayout(
  overlayIconElement: HTMLImageElement,
): void {
  applyBrandOverlayImageSize(
    overlayIconElement,
    window.innerWidth,
    window.innerHeight,
  );
}
