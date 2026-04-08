/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  ForegroundUiElement,
  type ForegroundUiElementSize,
} from "./ForegroundUiElement";

/**
 * @brief Centered brand icon overlay shown over the background video
 *
 * This model keeps shared icon sizing and placement in core while leaving
 * asset resolution and rendering mechanics to each app runtime.
 */
export class CenteredIconOverlayModel extends ForegroundUiElement {
  public readonly aspectRatio: number;
  public readonly maxSizePx: number;
  public readonly viewportRatio: number;

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
    super(id, "center");
    this.aspectRatio = aspectRatio;
    this.maxSizePx = maxSizePx;
    this.viewportRatio = viewportRatio;
  }

  /**
   * @brief Return the semantic element type for the centered icon overlay
   *
   * @returns Stable key identifying this foreground element kind
   */
  public getElementType(): string {
    return "centered_icon_overlay";
  }

  /**
   * @brief Compute the icon edge length for the supplied viewport
   *
   * @param availableWidth - Viewport width available to the icon
   * @param availableHeight - Viewport height available to the icon
   *
   * @returns Square icon edge length after applying the shared size policy
   */
  public getIconSize(availableWidth: number, availableHeight: number): number {
    const smallerDimension: number = Math.min(availableWidth, availableHeight);
    const scaledSize: number = smallerDimension * this.viewportRatio;

    return Math.min(scaledSize, this.maxSizePx);
  }

  /**
   * @brief Compute width and height guidance for runtime renderers
   *
   * @param availableWidth - Viewport width available to the icon
   * @param availableHeight - Viewport height available to the icon
   *
   * @returns Shared width and height guidance for the icon overlay
   */
  public getLayoutSize(
    availableWidth: number,
    availableHeight: number,
  ): ForegroundUiElementSize {
    const iconSize: number = this.getIconSize(availableWidth, availableHeight);

    return {
      width: iconSize,
      height: iconSize / this.aspectRatio,
    };
  }
}

/**
 * @brief Shared centered icon overlay used by the demo experience
 */
export const DEMO_CENTERED_ICON_OVERLAY: CenteredIconOverlayModel =
  new CenteredIconOverlayModel("brand-icon-overlay", 1, 240, 0.32);
