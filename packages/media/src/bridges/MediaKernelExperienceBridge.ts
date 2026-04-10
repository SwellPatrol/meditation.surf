/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  FocusDelayController,
  type FocusDelayState,
} from "../intent/FocusDelayController";
import type { MediaIntent } from "../intent/MediaIntent";
import type { MediaKernelController } from "../kernel/MediaKernelController";
import type { MediaKernelItem } from "../kernel/MediaKernelItem";
import type { MediaSourceDescriptor } from "../sources/MediaSourceDescriptor";
import type { MediaThumbnailController } from "../thumbnails/MediaThumbnailController";
import type {
  MediaThumbnailPriority,
  MediaThumbnailQuality,
} from "../thumbnails/MediaThumbnailExtractionPolicy";
import type { MediaThumbnailRequest } from "../thumbnails/MediaThumbnailRequest";

type MediaThumbnailCandidate<TMediaItem extends MediaKernelItem> = {
  mediaItem: TMediaItem;
  rowIndex: number;
  itemIndex: number;
};

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
  getRowCount(): number;
  getItemCountAtRow(rowIndex: number): number;
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
  private static readonly FOCUSED_ITEM_RADIUS: number = 2;
  private static readonly FOCUSED_ROW_RADIUS: number = 1;
  private static readonly UNFOCUSED_MAX_ITEMS_PER_ROW: number = 4;
  private static readonly UNFOCUSED_MAX_ROWS: number = 2;

  private readonly browseContentAdapter: MediaBrowseContentResolver<TMediaItem>;
  private readonly browseFocusController: MediaBrowseFocusController;
  private readonly browseSelectionController: MediaBrowseSelectionController;
  private readonly focusDelayController: FocusDelayController;
  private readonly mediaKernelController: MediaKernelController;
  private readonly mediaThumbnailController: MediaThumbnailController | null;
  private readonly playbackSequenceController: MediaPlaybackSequenceController<TMediaItem>;
  private readonly unsubscribeCallbacks: Array<() => void>;

  private browseFocusState: MediaBrowseFocusState;
  private browseSelectionState: MediaBrowseSelectionState;
  private focusDelayState: FocusDelayState;
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
    mediaThumbnailController: MediaThumbnailController | null = null,
  ) {
    this.browseContentAdapter = browseContentAdapter;
    this.browseFocusController = browseFocusController;
    this.browseSelectionController = browseSelectionController;
    this.focusDelayController = new FocusDelayController();
    this.mediaKernelController = mediaKernelController;
    this.mediaThumbnailController = mediaThumbnailController;
    this.playbackSequenceController = playbackSequenceController;
    this.unsubscribeCallbacks = [];
    this.browseFocusState = this.browseFocusController.getState();
    this.browseSelectionState = this.browseSelectionController.getState();
    this.focusDelayState = this.focusDelayController.getState();
    this.playbackSequenceState = this.playbackSequenceController.getState();

    this.unsubscribeCallbacks.push(
      this.browseFocusController.subscribe(
        (browseFocusState: MediaBrowseFocusState): void => {
          this.browseFocusState = browseFocusState;
          this.syncFocusedItemDelayState();
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
          this.syncFocusedItemDelayState();
        },
      ),
    );
    this.unsubscribeCallbacks.push(
      this.focusDelayController.subscribe(
        (focusDelayState: FocusDelayState): void => {
          this.focusDelayState = focusDelayState;
          this.syncMediaKernelPlanningContext();
        },
      ),
    );
    this.syncFocusedItemDelayState();
  }

  /**
   * @brief Release bridge subscriptions
   */
  public destroy(): void {
    for (const unsubscribeCallback of this.unsubscribeCallbacks) {
      unsubscribeCallback();
    }

    this.unsubscribeCallbacks.length = 0;
    this.focusDelayController.destroy();
  }

  /**
   * @brief Return the timed-focus controller owned by the bridge
   *
   * @returns Timed-focus controller used to escalate focus intent
   */
  public getFocusDelayController(): FocusDelayController {
    return this.focusDelayController;
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
    this.syncThumbnailRequests(focusedItem);
  }

  /**
   * @brief Sync the currently focused item identifier into the timed-focus controller
   */
  private syncFocusedItemDelayState(): void {
    const focusedItemId: string | null = this.resolveFocusedItem()?.id ?? null;

    this.focusDelayController.setFocusedItemId(focusedItemId);
    this.syncMediaKernelPlanningContext();
  }

  /**
   * @brief Reflect the current browse neighborhood into bounded thumbnail requests
   *
   * @param focusedItem - Focused media item when one exists
   */
  private syncThumbnailRequests(focusedItem: TMediaItem | null): void {
    if (this.mediaThumbnailController === null) {
      return;
    }

    const thumbnailCandidates: MediaThumbnailCandidate<TMediaItem>[] =
      this.resolveThumbnailCandidates();
    const thumbnailRequests: MediaThumbnailRequest[] = thumbnailCandidates.map(
      (
        thumbnailCandidate: MediaThumbnailCandidate<TMediaItem>,
      ): MediaThumbnailRequest =>
        this.createThumbnailRequest(
          thumbnailCandidate,
          focusedItem?.id ?? null,
        ),
    );

    this.mediaThumbnailController.setRequests(thumbnailRequests);
  }

  /**
   * @brief Resolve a bounded set of browse items that should own still requests
   *
   * @returns Deterministically ordered thumbnail candidates
   */
  private resolveThumbnailCandidates(): MediaThumbnailCandidate<TMediaItem>[] {
    const thumbnailCandidates: MediaThumbnailCandidate<TMediaItem>[] = [];
    const seenItemIds: Set<string> = new Set<string>();

    if (this.browseFocusState.hasFocusedItem) {
      this.appendFocusedThumbnailCandidates(thumbnailCandidates, seenItemIds);
      return thumbnailCandidates;
    }

    this.appendUnfocusedThumbnailCandidates(thumbnailCandidates, seenItemIds);

    return thumbnailCandidates;
  }

  /**
   * @brief Add a focus-centered thumbnail neighborhood to the candidate list
   *
   * @param thumbnailCandidates - Ordered candidate list being assembled
   * @param seenItemIds - Dedupe set keyed by item identifier
   */
  private appendFocusedThumbnailCandidates(
    thumbnailCandidates: MediaThumbnailCandidate<TMediaItem>[],
    seenItemIds: Set<string>,
  ): void {
    const focusedRowIndex: number = this.browseFocusState.activeRowIndex;
    const minimumRowIndex: number = Math.max(
      0,
      focusedRowIndex - MediaKernelExperienceBridge.FOCUSED_ROW_RADIUS,
    );
    const maximumRowIndex: number = Math.min(
      this.browseContentAdapter.getRowCount() - 1,
      focusedRowIndex + MediaKernelExperienceBridge.FOCUSED_ROW_RADIUS,
    );

    for (
      let rowIndex: number = minimumRowIndex;
      rowIndex <= maximumRowIndex;
      rowIndex += 1
    ) {
      const anchorItemIndex: number =
        rowIndex === focusedRowIndex
          ? (this.browseFocusState.activeItemIndexByRow[rowIndex] ?? 0)
          : (this.browseFocusState.activeItemIndexByRow[rowIndex] ?? 0);
      const itemRadius: number =
        rowIndex === focusedRowIndex
          ? MediaKernelExperienceBridge.FOCUSED_ITEM_RADIUS
          : 1;
      const itemCount: number =
        this.browseContentAdapter.getItemCountAtRow(rowIndex);
      const minimumItemIndex: number = Math.max(
        0,
        anchorItemIndex - itemRadius,
      );
      const maximumItemIndex: number = Math.min(
        itemCount - 1,
        anchorItemIndex + itemRadius,
      );

      for (
        let itemIndex: number = minimumItemIndex;
        itemIndex <= maximumItemIndex;
        itemIndex += 1
      ) {
        this.appendThumbnailCandidate(
          thumbnailCandidates,
          seenItemIds,
          rowIndex,
          itemIndex,
        );
      }
    }
  }

  /**
   * @brief Seed initial idle browse rows with a small thumbnail request set
   *
   * @param thumbnailCandidates - Ordered candidate list being assembled
   * @param seenItemIds - Dedupe set keyed by item identifier
   */
  private appendUnfocusedThumbnailCandidates(
    thumbnailCandidates: MediaThumbnailCandidate<TMediaItem>[],
    seenItemIds: Set<string>,
  ): void {
    const maximumRowCount: number = Math.min(
      this.browseContentAdapter.getRowCount(),
      MediaKernelExperienceBridge.UNFOCUSED_MAX_ROWS,
    );

    for (let rowIndex: number = 0; rowIndex < maximumRowCount; rowIndex += 1) {
      const itemCount: number = Math.min(
        this.browseContentAdapter.getItemCountAtRow(rowIndex),
        MediaKernelExperienceBridge.UNFOCUSED_MAX_ITEMS_PER_ROW,
      );

      for (let itemIndex: number = 0; itemIndex < itemCount; itemIndex += 1) {
        this.appendThumbnailCandidate(
          thumbnailCandidates,
          seenItemIds,
          rowIndex,
          itemIndex,
        );
      }
    }
  }

  /**
   * @brief Append one thumbnail candidate when the browse slot resolves cleanly
   *
   * @param thumbnailCandidates - Ordered candidate list being assembled
   * @param seenItemIds - Dedupe set keyed by item identifier
   * @param rowIndex - Browse row that owns the candidate
   * @param itemIndex - Browse item position inside the row
   */
  private appendThumbnailCandidate(
    thumbnailCandidates: MediaThumbnailCandidate<TMediaItem>[],
    seenItemIds: Set<string>,
    rowIndex: number,
    itemIndex: number,
  ): void {
    const mediaItem: TMediaItem | null =
      this.browseContentAdapter.getMediaItemAt(rowIndex, itemIndex);

    if (mediaItem === null || seenItemIds.has(mediaItem.id)) {
      return;
    }

    seenItemIds.add(mediaItem.id);
    thumbnailCandidates.push({
      mediaItem,
      rowIndex,
      itemIndex,
    });
  }

  /**
   * @brief Build one shared thumbnail request from a browse candidate
   *
   * @param thumbnailCandidate - Candidate item and browse position
   * @param focusedItemId - Focused item identifier, or `null`
   *
   * @returns Shared request consumed by the thumbnail controller
   */
  private createThumbnailRequest(
    thumbnailCandidate: MediaThumbnailCandidate<TMediaItem>,
    focusedItemId: string | null,
  ): MediaThumbnailRequest {
    const sourceDescriptor: MediaSourceDescriptor =
      this.mediaKernelController.getSourceDescriptorForItem(
        thumbnailCandidate.mediaItem,
      );
    const isFocusedCandidate: boolean =
      thumbnailCandidate.mediaItem.id === focusedItemId;
    const isFocusedRowCandidate: boolean =
      thumbnailCandidate.rowIndex === this.browseFocusState.activeRowIndex;
    const priorityHint: MediaThumbnailPriority = isFocusedCandidate
      ? "high"
      : isFocusedRowCandidate
        ? "medium"
        : "low";
    const qualityHint: MediaThumbnailQuality = isFocusedCandidate
      ? "high"
      : isFocusedRowCandidate
        ? "medium"
        : "low";
    const targetWidth: number = isFocusedCandidate
      ? 480
      : isFocusedRowCandidate
        ? 360
        : 320;
    const timeoutMs: number = isFocusedCandidate
      ? 3200
      : isFocusedRowCandidate
        ? 2200
        : 1800;

    return {
      descriptor: {
        itemIds: [thumbnailCandidate.mediaItem.id],
        sourceId: sourceDescriptor.sourceId,
        sourceDescriptor,
      },
      sourceDescriptor,
      sourceId: sourceDescriptor.sourceId,
      priorityHint,
      qualityHint,
      targetWidth,
      targetHeight: null,
      timeHintMs: 0,
      extractionPolicy: {
        strategy: "first-frame",
        quality: qualityHint,
        timeoutMs,
        targetWidth,
        targetHeight: null,
      },
    };
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
    if (
      focusedItem !== null &&
      focusedItem.id !== selectedItem?.id &&
      focusedItem.id !== activeItem?.id
    ) {
      return {
        targetItemId: focusedItem.id,
        type: this.focusDelayState.hasDelayElapsed
          ? "focused-delay-elapsed"
          : "focused",
      };
    }

    if (selectedItem !== null) {
      return {
        targetItemId: selectedItem.id,
        type: "selected",
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
