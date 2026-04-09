/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { BrowseFocusCommand } from "@meditation-surf/core";
import { BrowseInteractionController } from "@meditation-surf/core";
import { Platform } from "react-native";

/**
 * @brief Pressable handlers used by Expo browse items
 */
export interface ExpoBrowseItemInputHandlers {
  readonly onHoverIn: () => void;
  readonly onPress: () => void;
  readonly onPressIn: () => void;
}

/**
 * @brief Focus-capable root props used by the Expo app shell on web
 */
export interface ExpoBrowseRootInputProps {
  readonly focusable?: boolean;
  readonly tabIndex?: -1 | 0;
}

/**
 * @brief Small focus handle implemented by the Expo root view on web
 */
export interface ExpoFocusableElement {
  focus?: () => void;
}

/**
 * @brief Translate Expo press and hover input into shared browse commands
 */
export class ExpoBrowseInputAdapter {
  private readonly browseInteractionController: BrowseInteractionController;
  private readonly handleWindowKeyDown: (event: KeyboardEvent) => void;

  /**
   * @brief Create the Expo browse input adapter
   *
   * @param browseInteractionController - Shared browse interaction semantics
   */
  public constructor(browseInteractionController: BrowseInteractionController) {
    this.browseInteractionController = browseInteractionController;
    this.handleWindowKeyDown = (event: KeyboardEvent): void => {
      this.handleDirectionalKeyboardInput(event);
    };
  }

  /**
   * @brief Attach directional keyboard input when the Expo app runs on web
   *
   * @returns Cleanup callback that removes the registered listener
   */
  public attachDirectionalKeyboardInput(): () => void {
    if (!this.supportsWebKeyboardInput()) {
      return (): void => {};
    }

    window.addEventListener("keydown", this.handleWindowKeyDown);

    return (): void => {
      window.removeEventListener("keydown", this.handleWindowKeyDown);
    };
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

  /**
   * @brief Return the minimal root props needed for Expo web keyboard capture
   *
   * @returns Focus props for the root Expo view on web
   */
  public getRootInputProps(): ExpoBrowseRootInputProps {
    if (!this.supportsWebKeyboardInput()) {
      return {};
    }

    return {
      focusable: true,
      tabIndex: 0,
    };
  }

  /**
   * @brief Focus the Expo root surface so web development accepts arrow keys
   *
   * @param focusableElement - Root element exposed by the screen component
   */
  public focusKeyboardRoot(
    focusableElement: ExpoFocusableElement | null,
  ): void {
    if (!this.supportsWebKeyboardInput()) {
      return;
    }

    focusableElement?.focus?.();
  }

  /**
   * @brief Map arrow-key presses onto shared directional browse commands
   *
   * @param event - Browser keyboard event sourced from the active window
   */
  private handleDirectionalKeyboardInput(event: KeyboardEvent): void {
    const focusCommand: BrowseFocusCommand | null =
      this.getBrowseFocusCommandFromKeyboardEvent(event);

    if (focusCommand === null) {
      return;
    }

    event.preventDefault();
    this.browseInteractionController.dispatchBrowseFocusCommand(focusCommand);
  }

  /**
   * @brief Convert a keyboard event into a shared directional browse command
   *
   * @param event - Browser keyboard event to inspect
   *
   * @returns Shared browse command or `null` when the key is unrelated
   */
  private getBrowseFocusCommandFromKeyboardEvent(
    event: KeyboardEvent,
  ): BrowseFocusCommand | null {
    switch (event.key) {
      case "ArrowLeft":
        return "moveLeft";
      case "ArrowRight":
        return "moveRight";
      case "ArrowUp":
        return "moveUp";
      case "ArrowDown":
        return "moveDown";
      default:
        return null;
    }
  }

  /**
   * @brief Return whether the current Expo runtime can listen for web keys
   *
   * @returns `true` when the runtime exposes browser keyboard events
   */
  private supportsWebKeyboardInput(): boolean {
    return Platform.OS === "web" && typeof window !== "undefined";
  }
}
