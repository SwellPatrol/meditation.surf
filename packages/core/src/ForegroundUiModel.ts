/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { CenteredIconOverlayModel } from "./CenteredIconOverlayModel";
import { ForegroundUiElement } from "./ForegroundUiElement";

/**
 * @brief Runtime-agnostic collection of foreground UI elements
 */
export class ForegroundUiModel {
  private readonly elements: ForegroundUiElement[];

  /**
   * @brief Create a foreground UI model from a list of shared elements
   *
   * @param elements - Ordered foreground elements rendered above video
   */
  public constructor(elements: ForegroundUiElement[]) {
    this.elements = elements;
  }

  /**
   * @brief Return all foreground elements in render order
   *
   * @returns A shallow copy of the shared foreground element list
   */
  public getElements(): ForegroundUiElement[] {
    return [...this.elements];
  }

  /**
   * @brief Return the centered icon overlay when present
   *
   * @returns The first centered icon overlay, or `null` if one is absent
   */
  public getCenteredIconOverlay(): CenteredIconOverlayModel | null {
    const centeredIconOverlay: ForegroundUiElement | undefined =
      this.elements.find(
        (element: ForegroundUiElement): boolean =>
          element instanceof CenteredIconOverlayModel,
      );

    if (centeredIconOverlay instanceof CenteredIconOverlayModel) {
      return centeredIconOverlay;
    }

    return null;
  }
}
