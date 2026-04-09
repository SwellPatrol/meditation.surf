/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaIntent } from "../intent/MediaIntent";
import type { MediaKernelController } from "../kernel/MediaKernelController";
import type { MediaKernelItem } from "../kernel/MediaKernelItem";

/**
 * @brief Immutable focus state consumed by the shared media bridge
 */
export type MediaBrowseFocusState = {
  hasFocusedItem: boolean;
  activeRowIndex: number;
  activeItemIndexByRow: ArrayLike<number>;
};

/**
 * @brief Immutable selection state consumed by the shared media bridge
 */
export type MediaBrowseSelectionState = {
  hasSelectedItem: boolean;
  selectedRowIndex: number;
  selectedItemIndex: number;
};

/**
 * @brief Immutable playback sequence state consumed by the shared media bridge
 */
export type MediaPlaybackSequenceState<
  TMediaItem extends MediaKernelItem = MediaKernelItem,
> = {
  activeItem: TMediaItem | null;
};

/**
 * @brief Shared browse resolver contract needed by the media bridge
 */
export interface MediaBrowseContentResolver<
  TMediaItem extends MediaKernelItem = MediaKernelItem,
> {
  getMediaItemAt(rowIndex: number, itemIndex: number): TMediaItem | null;
}

/**
 * @brief Shared focus controller contract needed by the media bridge
 */
export interface MediaBrowseFocusController {
  getState(): MediaBrowseFocusState;
  subscribe(listener: (state: MediaBrowseFocusState) => void): () => void;
}

/**
 * @brief Shared selection controller contract needed by the media bridge
 */
export interface MediaBrowseSelectionController {
  getState(): MediaBrowseSelectionState;
  subscribe(listener: (state: MediaBrowseSelectionState) => void): () => void;
}

/**
 * @brief Shared playback controller contract needed by the media bridge
 */
export interface MediaPlaybackSequenceController<
  TMediaItem extends MediaKernelItem = MediaKernelItem,
> {
  getState(): MediaPlaybackSequenceState<TMediaItem>;
  subscribe(
    listener: (state: MediaPlaybackSequenceState<TMediaItem>) => void,
  ): () => void;
}

/**
 * @brief Translate shared browse and playback state into media-kernel planning inputs
 *
 * The bridge keeps orchestration updates inside shared code so each app shell
 * can keep reporting capabilities without owning planning logic.
 */
export class MediaKernelExperienceBridge<
  TMediaItem extends MediaKernelItem = MediaKernelItem,
> {
  private readonly browseContentAdapter: MediaBrowseContentResolver<TMediaItem>;
  private readonly browseFocusController: MediaBrowseFocusController;
  private readonly browseSelectionController: MediaBrowseSelectionController;
  private readonly mediaKernelController: MediaKernelController;
  private readonly playbackSequenceController: MediaPlaybackSequenceController<TMediaItem>;
  private readonly unsubscribeCallbacks: Array<() => void>;

  private browseFocusState: MediaBrowseFocusState;
  private browseSelectionState: MediaBrowseSelectionState;
  private playbackSequenceState: MediaPlaybackSequenceState<TMediaItem>;

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
    browseContentAdapter: MediaBrowseContentResolver<TMediaItem>,
    browseFocusController: MediaBrowseFocusController,
    browseSelectionController: MediaBrowseSelectionController,
    mediaKernelController: MediaKernelController,
    playbackSequenceController: MediaPlaybackSequenceController<TMediaItem>,
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
        (browseFocusState: MediaBrowseFocusState): void => {
          this.browseFocusState = browseFocusState;
          this.syncMediaKernelPlanningContext();
        },
      ),
    );
    this.unsubscribeCallbacks.push(
      this.browseSelectionController.subscribe(
        (browseSelectionState: MediaBrowseSelectionState): void => {
          this.browseSelectionState = browseSelectionState;
          this.syncMediaKernelPlanningContext();
        },
      ),
    );
    this.unsubscribeCallbacks.push(
      this.playbackSequenceController.subscribe(
        (
          playbackSequenceState: MediaPlaybackSequenceState<TMediaItem>,
        ): void => {
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
    const focusedItem: TMediaItem | null = this.resolveFocusedItem();
    const selectedItem: TMediaItem | null = this.resolveSelectedItem();
    const activeItem: TMediaItem | null = this.playbackSequenceState.activeItem;
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
  private resolveFocusedItem(): TMediaItem | null {
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
  private resolveSelectedItem(): TMediaItem | null {
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
    focusedItem: TMediaItem | null,
    selectedItem: TMediaItem | null,
    activeItem: TMediaItem | null,
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
