/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { ForegroundLayerLayout } from "../layout/ForegroundLayerLayout";
import { CenteredIconOverlayModel } from "./CenteredIconOverlayModel";
import { ForegroundUiElement } from "./ForegroundUiElement";

type LegacyForegroundUiModelElement =
  | ForegroundUiElement
  | CenteredIconOverlayModel;

/**
 * @brief Runtime-agnostic collection of foreground UI elements
 */
export class ForegroundUiModel {
  private readonly elements: LegacyForegroundUiModelElement[];

  /**
   * @brief Create a foreground UI model from a list of shared elements
   *
   * @param elements - Ordered foreground elements rendered above video
   */
  public constructor(elements: LegacyForegroundUiModelElement[]) {
    this.elements = elements;
  }

  /**
   * @brief Return all foreground elements in render order
   *
   * @returns A shallow copy of the shared foreground element list
   */
  public getElements(): LegacyForegroundUiModelElement[] {
    return [...this.elements];
  }

  /**
   * @brief Return the centered icon overlay when present
   *
   * @returns The first centered icon overlay, or `null` if one is absent
   */
  public getCenteredIconOverlay(): CenteredIconOverlayModel | null {
    const centeredIconOverlay: LegacyForegroundUiModelElement | undefined =
      this.elements.find(
        (element: LegacyForegroundUiModelElement): boolean =>
          element instanceof CenteredIconOverlayModel,
      );

    if (centeredIconOverlay instanceof CenteredIconOverlayModel) {
      return centeredIconOverlay;
    }

    return null;
  }

  /**
   * @brief Build a legacy foreground UI model from the shared foreground layer
   *
   * @param foregroundLayer - Shared foreground layer layout
   *
   * @returns Foreground UI wrapper for older consumers
   */
  public static fromForegroundLayer(
    foregroundLayer: ForegroundLayerLayout,
  ): ForegroundUiModel {
    const centeredOverlay: CenteredIconOverlayModel | null =
      foregroundLayer.getCenteredOverlay() instanceof CenteredIconOverlayModel
        ? (foregroundLayer.getCenteredOverlay() as CenteredIconOverlayModel)
        : null;

    return new ForegroundUiModel(
      centeredOverlay === null ? [] : [centeredOverlay],
    );
  }
}
