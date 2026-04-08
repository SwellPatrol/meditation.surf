/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  CenteredOverlayLayout,
  CenteredOverlaySize,
  MeditationExperience,
} from "@meditation-surf/core";

import { TvStageIconLayout } from "../layout/TvStageIconLayout";

/**
 * @brief Adapt the shared foreground UI model into TV-specific render sizing
 */
export class TvForegroundUiController {
  private readonly overlayModel: CenteredOverlayLayout;
  private readonly stageIconLayout: TvStageIconLayout;

  /**
   * @brief Build the TV foreground UI adapter from the shared experience
   *
   * @param experience - Shared meditation experience
   */
  public constructor(experience: MeditationExperience) {
    const overlayModel: CenteredOverlayLayout | null = experience.appLayout
      .getForegroundLayer()
      .getCenteredOverlay();

    if (overlayModel === null) {
      throw new Error(
        "Expected the demo app layout to expose a centered overlay.",
      );
    }

    this.overlayModel = overlayModel;
    this.stageIconLayout = new TvStageIconLayout();
  }

  /**
   * @brief Return the shared centered icon overlay rendered by the TV app
   *
   * @returns Shared centered icon overlay model
   */
  public getOverlayModel(): CenteredOverlayLayout {
    return this.overlayModel;
  }

  /**
   * @brief Compute the centered icon size to render inside the fixed Lightning stage
   *
   * @param stageWidth - Fixed Lightning stage width
   * @param stageHeight - Fixed Lightning stage height
   * @param viewportWidth - Live browser viewport width
   * @param viewportHeight - Live browser viewport height
   *
   * @returns Stage-compensated icon size for Lightning rendering
   */
  public getStageIconSize(
    stageWidth: number,
    stageHeight: number,
    viewportWidth: number,
    viewportHeight: number,
  ): CenteredOverlaySize {
    const layoutSize: CenteredOverlaySize = this.overlayModel.getLayoutSize(
      viewportWidth,
      viewportHeight,
    );

    return {
      width: this.stageIconLayout.getStageCompensatedElementSize(
        layoutSize.width,
        {
          stageWidth,
          stageHeight,
          viewportWidth,
          viewportHeight,
        },
      ),
      height: this.stageIconLayout.getStageCompensatedElementSize(
        layoutSize.height,
        {
          stageWidth,
          stageHeight,
          viewportWidth,
          viewportHeight,
        },
      ),
    };
  }
}
