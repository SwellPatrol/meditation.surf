/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { BrowseContentAdapter } from "../browse/BrowseContentAdapter";
import type {
  BrowseFocusController,
  BrowseFocusState,
} from "../browse/BrowseFocusController";
import type {
  BrowseSelectionController,
  BrowseSelectionState,
} from "../browse/BrowseSelectionController";
import type { MediaItem } from "../catalog/MediaItem";
import type { MediaIntent } from "../media/MediaIntent";
import type { MediaKernelController } from "../media/MediaKernelController";
import type {
  PlaybackSequenceController,
  PlaybackSequenceState,
} from "../playback/PlaybackSequenceController";

/**
 * @brief Translate shared browse and playback state into media-kernel planning inputs
 *
 * The bridge keeps orchestration updates inside shared code so each app shell
 * can keep reporting capabilities without owning planning logic.
 */
export class MediaKernelExperienceBridge {
  private readonly browseContentAdapter: BrowseContentAdapter;
  private readonly browseFocusController: BrowseFocusController;
  private readonly browseSelectionController: BrowseSelectionController;
  private readonly mediaKernelController: MediaKernelController;
  private readonly playbackSequenceController: PlaybackSequenceController;
  private readonly unsubscribeCallbacks: Array<() => void>;

  private browseFocusState: BrowseFocusState;
  private browseSelectionState: BrowseSelectionState;
  private playbackSequenceState: PlaybackSequenceState;

  /**
   * @brief Create a shared bridge from current app state into the media kernel
   *
   * @param browseContentAdapter - Shared browse content resolver
   * @param browseFocusController - Shared browse focus controller
   * @param browseSelectionController - Shared browse selection controller
   * @param mediaKernelController - Shared media orchestration controller
   * @param playbackSequenceController - Shared playback sequence controller
   */
  public constructor(
    browseContentAdapter: BrowseContentAdapter,
    browseFocusController: BrowseFocusController,
    browseSelectionController: BrowseSelectionController,
    mediaKernelController: MediaKernelController,
    playbackSequenceController: PlaybackSequenceController,
  ) {
    this.browseContentAdapter = browseContentAdapter;
    this.browseFocusController = browseFocusController;
    this.browseSelectionController = browseSelectionController;
    this.mediaKernelController = mediaKernelController;
    this.playbackSequenceController = playbackSequenceController;
    this.unsubscribeCallbacks = [];
    this.browseFocusState = this.browseFocusController.getState();
    this.browseSelectionState = this.browseSelectionController.getState();
    this.playbackSequenceState = this.playbackSequenceController.getState();

    this.unsubscribeCallbacks.push(
      this.browseFocusController.subscribe(
        (browseFocusState: BrowseFocusState): void => {
          this.browseFocusState = browseFocusState;
          this.syncMediaKernelPlanningContext();
        },
      ),
    );
    this.unsubscribeCallbacks.push(
      this.browseSelectionController.subscribe(
        (browseSelectionState: BrowseSelectionState): void => {
          this.browseSelectionState = browseSelectionState;
          this.syncMediaKernelPlanningContext();
        },
      ),
    );
    this.unsubscribeCallbacks.push(
      this.playbackSequenceController.subscribe(
        (playbackSequenceState: PlaybackSequenceState): void => {
          this.playbackSequenceState = playbackSequenceState;
          this.syncMediaKernelPlanningContext();
        },
      ),
    );
  }

  /**
   * @brief Release bridge subscriptions
   */
  public destroy(): void {
    for (const unsubscribeCallback of this.unsubscribeCallbacks) {
      unsubscribeCallback();
    }

    this.unsubscribeCallbacks.length = 0;
  }

  /**
   * @brief Push the latest shared browse and playback state into the media kernel
   */
  private syncMediaKernelPlanningContext(): void {
    const focusedItem: MediaItem | null = this.resolveFocusedItem();
    const selectedItem: MediaItem | null = this.resolveSelectedItem();
    const activeItem: MediaItem | null = this.playbackSequenceState.activeItem;
    const mediaIntent: MediaIntent = this.createMediaIntent(
      focusedItem,
      selectedItem,
      activeItem,
    );

    this.mediaKernelController.setPlanningContext(
      mediaIntent,
      focusedItem,
      selectedItem,
      activeItem,
    );
  }

  /**
   * @brief Resolve the currently focused browse item into a shared media item
   *
   * @returns Focused media item, or `null` when nothing is focused
   */
  private resolveFocusedItem(): MediaItem | null {
    if (!this.browseFocusState.hasFocusedItem) {
      return null;
    }

    const rowIndex: number = this.browseFocusState.activeRowIndex;
    const itemIndex: number =
      this.browseFocusState.activeItemIndexByRow[rowIndex] ?? 0;

    return this.browseContentAdapter.getMediaItemAt(rowIndex, itemIndex);
  }

  /**
   * @brief Resolve the currently selected browse item into a shared media item
   *
   * @returns Selected media item, or `null` when nothing is selected
   */
  private resolveSelectedItem(): MediaItem | null {
    if (!this.browseSelectionState.hasSelectedItem) {
      return null;
    }

    return this.browseContentAdapter.getMediaItemAt(
      this.browseSelectionState.selectedRowIndex,
      this.browseSelectionState.selectedItemIndex,
    );
  }

  /**
   * @brief Derive the current logical media intent from browse and playback state
   *
   * @param focusedItem - Focused browse item when one exists
   * @param selectedItem - Explicitly selected browse item when one exists
   * @param activeItem - Current playback item when one exists
   *
   * @returns High-level intent snapshot for the media planner
   */
  private createMediaIntent(
    focusedItem: MediaItem | null,
    selectedItem: MediaItem | null,
    activeItem: MediaItem | null,
  ): MediaIntent {
    if (selectedItem !== null) {
      return {
        targetItemId: selectedItem.id,
        type: "selected",
      };
    }

    if (focusedItem !== null) {
      return {
        targetItemId: focusedItem.id,
        type: "focused",
      };
    }

    if (activeItem !== null) {
      return {
        targetItemId: activeItem.id,
        type: "background-active",
      };
    }

    return {
      targetItemId: null,
      type: "idle",
    };
  }
}
