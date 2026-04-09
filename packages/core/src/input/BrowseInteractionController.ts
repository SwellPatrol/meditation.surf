/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { BrowseFocusController } from "../browse/BrowseFocusController";

/**
 * @brief Supported browse input modes shared across app surfaces
 */
export type BrowseInputMode = "keyboard" | "pointer";

/**
 * @brief Focus commands consumed by the shared browse interaction controller
 */
export type BrowseFocusCommand =
  | "moveLeft"
  | "moveRight"
  | "moveUp"
  | "moveDown";

/**
 * @brief Listener signature used for browse input-mode updates
 */
export type BrowseInputModeListener = (inputMode: BrowseInputMode) => void;

/**
 * @brief Translate surface input into shared browse focus commands
 *
 * The interaction controller keeps directional-mode state local to the active
 * runtime, while the browse focus state itself stays in the shared
 * `BrowseFocusController`.
 */
export class BrowseInteractionController {
  private readonly browseFocusController: BrowseFocusController;
  private readonly inputModeListeners: Set<BrowseInputModeListener>;

  private inputMode: BrowseInputMode;

  /**
   * @brief Create a browse interaction controller for one app surface
   *
   * @param browseFocusController - Shared browse focus semantics
   */
  public constructor(browseFocusController: BrowseFocusController) {
    this.browseFocusController = browseFocusController;
    this.inputModeListeners = new Set<BrowseInputModeListener>();
    this.inputMode = "pointer";
  }

  /**
   * @brief Return the current browse input mode
   *
   * @returns Active browse input mode
   */
  public getInputMode(): BrowseInputMode {
    return this.inputMode;
  }

  /**
   * @brief Subscribe to browse input-mode updates
   *
   * @param listener - Callback notified when the input mode changes
   *
   * @returns Cleanup callback that removes the listener
   */
  public subscribeInputMode(listener: BrowseInputModeListener): () => void {
    this.inputModeListeners.add(listener);
    listener(this.inputMode);

    return (): void => {
      this.inputModeListeners.delete(listener);
    };
  }

  /**
   * @brief Enter directional keyboard mode
   */
  public enterKeyboardMode(): void {
    this.transitionInputMode("keyboard");
  }

  /**
   * @brief Enter pointer-driven browse mode
   */
  public enterPointerMode(): void {
    this.transitionInputMode("pointer");
  }

  /**
   * @brief Dispatch one of the shared directional browse commands
   *
   * @param command - Directional browse command sourced from a runtime adapter
   */
  public dispatchBrowseFocusCommand(command: BrowseFocusCommand): void {
    this.enterKeyboardMode();

    switch (command) {
      case "moveLeft":
        this.browseFocusController.moveLeft();
        break;
      case "moveRight":
        this.browseFocusController.moveRight();
        break;
      case "moveUp":
        this.browseFocusController.moveUp();
        break;
      case "moveDown":
        this.browseFocusController.moveDown();
        break;
      default:
        command satisfies never;
    }
  }

  /**
   * @brief Focus a concrete browse item without changing row-memory behavior
   *
   * @param rowIndex - Row containing the focused item
   * @param itemIndex - Item to activate within the row
   */
  public focusItem(rowIndex: number, itemIndex: number): void {
    this.browseFocusController.focusItem(rowIndex, itemIndex);
  }

  /**
   * @brief Release mode listeners owned by this surface-local controller
   */
  public destroy(): void {
    this.inputModeListeners.clear();
  }

  /**
   * @brief Commit a mode transition only when the mode actually changes
   *
   * @param inputMode - Candidate next input mode
   */
  private transitionInputMode(inputMode: BrowseInputMode): void {
    if (this.inputMode === inputMode) {
      return;
    }

    this.inputMode = inputMode;
    this.notifyInputModeListeners();
  }

  /**
   * @brief Notify every subscribed runtime about the latest input mode
   */
  private notifyInputModeListeners(): void {
    for (const inputModeListener of this.inputModeListeners) {
      inputModeListener(this.inputMode);
    }
  }
}
