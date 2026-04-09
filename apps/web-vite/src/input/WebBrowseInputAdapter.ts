/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  BrowseFocusCommand,
  BrowseInputMode,
} from "@meditation-surf/core";
import { BrowseInteractionController } from "@meditation-surf/core";

import type { WebAppShell } from "../ui/WebAppShell";

/**
 * @brief Own browser event wiring for web browse input
 *
 * The adapter keeps keyboard, pointer, and touch handling out of the DOM view
 * builder so the shell can stay focused on presentation.
 */
export class WebBrowseInputAdapter {
  private readonly browseInteractionController: BrowseInteractionController;
  private readonly handleDocumentClick: () => void;
  private readonly handleDocumentPointerDown: () => void;
  private readonly handleDocumentPointerMove: () => void;
  private readonly handleWindowKeyDown: (event: KeyboardEvent) => void;
  private readonly shell: WebAppShell;

  private isAttached: boolean;
  private removeInputModeSubscription: (() => void) | null;
  private thumbnailCleanupCallbacks: Array<() => void>;

  /**
   * @brief Create the web browse input adapter
   *
   * @param shell - Runtime DOM shell that renders the browse overlay
   * @param browseInteractionController - Shared browse interaction semantics
   */
  public constructor(
    shell: WebAppShell,
    browseInteractionController: BrowseInteractionController,
  ) {
    this.shell = shell;
    this.browseInteractionController = browseInteractionController;
    this.isAttached = false;
    this.removeInputModeSubscription = null;
    this.thumbnailCleanupCallbacks = [];
    this.handleWindowKeyDown = (event: KeyboardEvent): void => {
      this.handleDirectionalKeyboardInput(event);
    };
    this.handleDocumentPointerMove = (): void => {
      this.browseInteractionController.enterPointerMode();
    };
    this.handleDocumentPointerDown = (): void => {
      this.browseInteractionController.enterPointerMode();
    };
    this.handleDocumentClick = (): void => {
      this.browseInteractionController.enterPointerMode();
    };
  }

  /**
   * @brief Attach global and per-item input listeners
   */
  public attach(): void {
    if (this.isAttached) {
      return;
    }

    this.isAttached = true;
    window.addEventListener("keydown", this.handleWindowKeyDown);
    window.addEventListener("pointermove", this.handleDocumentPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", this.handleDocumentPointerDown, {
      passive: true,
    });
    window.addEventListener("click", this.handleDocumentClick, {
      passive: true,
    });
    this.removeInputModeSubscription =
      this.browseInteractionController.subscribeInputMode(
        (inputMode: BrowseInputMode): void => {
          this.shell.renderInputMode(inputMode);
        },
      );
    this.syncBrowseTargets();
  }

  /**
   * @brief Rebind thumbnail listeners after the shell rerenders browse content
   */
  public syncBrowseTargets(): void {
    this.clearThumbnailCleanupCallbacks();

    for (const rowCardElements of this.shell.getThumbnailCardElements()) {
      for (const thumbnailCardElement of rowCardElements) {
        const handlePointerEnter: () => void = (): void => {
          this.focusItemFromPointerTarget(thumbnailCardElement);
        };
        const handlePointerDown: () => void = (): void => {
          this.focusItemFromPointerTarget(thumbnailCardElement);
        };
        const handleClick: () => void = (): void => {
          this.focusItemFromPointerTarget(thumbnailCardElement);
        };

        thumbnailCardElement.addEventListener(
          "pointerenter",
          handlePointerEnter,
        );
        thumbnailCardElement.addEventListener("pointerdown", handlePointerDown);
        thumbnailCardElement.addEventListener("click", handleClick);
        this.thumbnailCleanupCallbacks.push((): void => {
          thumbnailCardElement.removeEventListener(
            "pointerenter",
            handlePointerEnter,
          );
          thumbnailCardElement.removeEventListener(
            "pointerdown",
            handlePointerDown,
          );
          thumbnailCardElement.removeEventListener("click", handleClick);
        });
      }
    }
  }

  /**
   * @brief Release every listener owned by the adapter
   */
  public destroy(): void {
    if (!this.isAttached) {
      return;
    }

    this.isAttached = false;
    this.clearThumbnailCleanupCallbacks();
    this.removeInputModeSubscription?.();
    this.removeInputModeSubscription = null;
    window.removeEventListener("keydown", this.handleWindowKeyDown);
    window.removeEventListener("pointermove", this.handleDocumentPointerMove);
    window.removeEventListener("pointerdown", this.handleDocumentPointerDown);
    window.removeEventListener("click", this.handleDocumentClick);
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
   * @brief Enter pointer mode and focus the item described by one card element
   *
   * @param thumbnailCardElement - Rendered card element with row and item data
   */
  private focusItemFromPointerTarget(thumbnailCardElement: HTMLElement): void {
    const rowIndexText: string | undefined =
      thumbnailCardElement.dataset.rowIndex;
    const itemIndexText: string | undefined =
      thumbnailCardElement.dataset.itemIndex;

    if (rowIndexText === undefined || itemIndexText === undefined) {
      return;
    }

    const rowIndex: number = Number.parseInt(rowIndexText, 10);
    const itemIndex: number = Number.parseInt(itemIndexText, 10);

    this.browseInteractionController.enterPointerMode();
    this.browseInteractionController.focusItem(rowIndex, itemIndex);
  }

  /**
   * @brief Remove the current batch of thumbnail-specific listeners
   */
  private clearThumbnailCleanupCallbacks(): void {
    for (const cleanupCallback of this.thumbnailCleanupCallbacks) {
      cleanupCallback();
    }

    this.thumbnailCleanupCallbacks = [];
  }
}
