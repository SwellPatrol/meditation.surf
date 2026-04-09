/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { BrowseInteractionController } from "@meditation-surf/core";

/**
 * @brief Pressable handlers used by Expo browse items
 */
export interface ExpoBrowseItemInputHandlers {
  readonly onHoverIn: () => void;
  readonly onPress: () => void;
  readonly onPressIn: () => void;
}

/**
 * @brief Translate Expo press and hover input into shared browse commands
 */
export class ExpoBrowseInputAdapter {
  private readonly browseInteractionController: BrowseInteractionController;

  /**
   * @brief Create the Expo browse input adapter
   *
   * @param browseInteractionController - Shared browse interaction semantics
   */
  public constructor(browseInteractionController: BrowseInteractionController) {
    this.browseInteractionController = browseInteractionController;
  }

  /**
   * @brief Build the handlers consumed by one browse thumbnail
   *
   * @param rowIndex - Row containing the interactive thumbnail
   * @param itemIndex - Item position inside that row
   *
   * @returns Stable semantics for hover and touch-driven focus
   */
  public createBrowseItemInputHandlers(
    rowIndex: number,
    itemIndex: number,
  ): ExpoBrowseItemInputHandlers {
    const focusItemFromPointer: () => void = (): void => {
      this.browseInteractionController.enterPointerMode();
      this.browseInteractionController.focusItem(rowIndex, itemIndex);
    };

    return {
      onHoverIn: (): void => {
        focusItemFromPointer();
      },
      onPress: (): void => {
        focusItemFromPointer();
      },
      onPressIn: (): void => {
        focusItemFromPointer();
      },
    };
  }
}
