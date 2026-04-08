/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { CenteredOverlayLayout } from "../layout/CenteredOverlayLayout";

/**
 * @brief Legacy alias for the centered icon overlay layout
 *
 * The repo now prefers `CenteredOverlayLayout` to describe the shared app
 * surface explicitly. This class remains as a compatibility-focused alias for
 * code that still refers to the older model name.
 */
export class CenteredIconOverlayModel extends CenteredOverlayLayout {
  /**
   * @brief Create a centered icon overlay with shared sizing rules
   *
   * @param id - Stable element identifier
   * @param aspectRatio - Width-to-height ratio for the icon
   * @param maxSizePx - Maximum rendered icon size in pixels
   * @param viewportRatio - Portion of the smaller viewport dimension to use
   */
  public constructor(
    id: string,
    aspectRatio: number,
    maxSizePx: number,
    viewportRatio: number,
  ) {
    super(id, aspectRatio, maxSizePx, viewportRatio);
  }
}

/**
 * @brief Shared centered icon overlay used by the demo experience
 */
export const DEMO_CENTERED_ICON_OVERLAY: CenteredIconOverlayModel =
  new CenteredIconOverlayModel("brand-icon-overlay", 1, 240, 0.32);
