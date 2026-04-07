/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { CenteredIconOverlayModel } from "@meditation-surf/core";

/**
 * @brief Keep the overlay icon centered and sized from the shared scene model
 *
 * @param overlayIconElement - DOM image element that renders the brand icon
 * @param overlayIconModel - Shared layout model for the centered icon overlay
 */
export function applyWebBrandOverlayLayout(
  overlayIconElement: HTMLImageElement,
  overlayIconModel: CenteredIconOverlayModel,
): void {
  const layoutSize: { width: number; height: number } =
    overlayIconModel.getLayoutSize(window.innerWidth, window.innerHeight);

  overlayIconElement.style.width = `${layoutSize.width}px`;
  overlayIconElement.style.height = `${layoutSize.height}px`;
}
