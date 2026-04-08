/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  CenteredIconOverlayModel,
  ForegroundUiElementSize,
  ForegroundUiModel,
} from "@meditation-surf/core";
import { BRAND_OVERLAY_ICON_SOURCE } from "@meditation-surf/core/brand/native";

/**
 * @brief Adapt the shared foreground UI model into Expo-specific view state
 */
export class ExpoForegroundUiController {
  private readonly foregroundUi: ForegroundUiModel;

  /**
   * @brief Capture the shared foreground UI model used by the Expo app
   *
   * @param foregroundUi - Shared foreground UI model
   */
  public constructor(foregroundUi: ForegroundUiModel) {
    this.foregroundUi = foregroundUi;
  }

  /**
   * @brief Return the native image source used by the centered icon overlay
   *
   * @returns React Native image source for the shared overlay icon
   */
  public getOverlayIconSource(): typeof BRAND_OVERLAY_ICON_SOURCE {
    return BRAND_OVERLAY_ICON_SOURCE;
  }

  /**
   * @brief Resolve the runtime-sized icon style for the current viewport
   *
   * @param viewportWidth - Live viewport width
   * @param viewportHeight - Live viewport height
   *
   * @returns Shared foreground icon size adapted for React Native style props
   */
  public getOverlayIconStyle(
    viewportWidth: number,
    viewportHeight: number,
  ): ForegroundUiElementSize {
    const overlayIconModel: CenteredIconOverlayModel =
      this.getCenteredIconOverlayModel();

    return overlayIconModel.getLayoutSize(viewportWidth, viewportHeight);
  }

  /**
   * @brief Resolve the centered icon overlay required by the current product surface
   *
   * @returns Shared centered icon overlay model
   */
  private getCenteredIconOverlayModel(): CenteredIconOverlayModel {
    const overlayIconModel: CenteredIconOverlayModel | null =
      this.foregroundUi.getCenteredIconOverlay();

    if (overlayIconModel === null) {
      throw new Error(
        "Expected the demo experience to expose a centered icon.",
      );
    }

    return overlayIconModel;
  }
}
