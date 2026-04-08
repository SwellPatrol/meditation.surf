/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  PlaybackVisualReadinessController,
  PlaybackVisualReadinessState,
} from "@meditation-surf/player-core";

import type { Catalog } from "../catalog/Catalog";
import type { CatalogSection } from "../catalog/CatalogSection";
import type { MediaItem } from "../catalog/MediaItem";

/**
 * @brief Snapshot describing the currently active shared playback item
 */
export type PlaybackSequenceState = {
  activeItem: MediaItem | null;
};

/**
 * @brief Shared listener signature for playback sequence updates
 */
export type PlaybackSequenceListener = (state: PlaybackSequenceState) => void;

/**
 * @brief Coordinate the current demo item and one-time autoplay advancement
 *
 * The demo experience still starts from the catalog's featured item, but this
 * controller adds a tiny layer of runtime semantics: once the initial item's
 * first frame is visually ready, wait five seconds and advance to the next
 * featured demo item exactly once.
 */
export class PlaybackSequenceController {
  private static readonly INITIAL_ADVANCE_DELAY_MS: number = 5000;

  private readonly playbackVisualReadinessController: PlaybackVisualReadinessController;
  private readonly sequenceItems: MediaItem[];
  private readonly initialItem: MediaItem | null;
  private readonly stateListeners: Set<PlaybackSequenceListener>;
  private readonly removePlaybackVisualReadinessSubscription: () => void;
  private readonly advanceDelayMs: number;
  private activeItem: MediaItem | null;
  private advanceTimerId: ReturnType<typeof globalThis.setTimeout> | null;
  private hasScheduledInitialAdvance: boolean;
  private hasAdvancedFromInitialItem: boolean;

  /**
   * @brief Create the playback sequence controller for the featured demo items
   *
   * @param catalog - Shared catalog whose featured section defines demo order
   * @param playbackVisualReadinessController - Shared first-frame readiness controller
   * @param advanceDelayMs - Delay before advancing after the initial visual-ready event
   */
  public constructor(
    catalog: Catalog,
    playbackVisualReadinessController: PlaybackVisualReadinessController,
    advanceDelayMs: number = PlaybackSequenceController.INITIAL_ADVANCE_DELAY_MS,
  ) {
    const featuredSection: CatalogSection | null = catalog.getFeaturedSection();

    this.playbackVisualReadinessController = playbackVisualReadinessController;
    this.sequenceItems = featuredSection?.getItems() ?? [];
    this.initialItem = this.sequenceItems[0] ?? null;
    this.stateListeners = new Set<PlaybackSequenceListener>();
    this.advanceDelayMs = advanceDelayMs;
    this.activeItem = this.initialItem;
    this.advanceTimerId = null;
    this.hasScheduledInitialAdvance = false;
    this.hasAdvancedFromInitialItem = false;
    this.removePlaybackVisualReadinessSubscription =
      this.playbackVisualReadinessController.subscribe(
        (playbackVisualReadinessState: PlaybackVisualReadinessState): void => {
          this.handlePlaybackVisualReadinessState(playbackVisualReadinessState);
        },
      );
  }

  /**
   * @brief Return the current playback sequence snapshot
   *
   * @returns Active playback item snapshot
   */
  public getState(): PlaybackSequenceState {
    return {
      activeItem: this.activeItem,
    };
  }

  /**
   * @brief Return the media item that should currently be playing
   *
   * @returns Active media item, or `null` when the sequence is empty
   */
  public getActiveItem(): MediaItem | null {
    return this.activeItem;
  }

  /**
   * @brief Return the current active item title
   *
   * @returns Active item title, or `null` when no item is active
   */
  public getActiveItemTitle(): string | null {
    return this.activeItem?.title ?? null;
  }

  /**
   * @brief Subscribe to shared playback sequence updates
   *
   * @param listener - Callback notified whenever the active item changes
   *
   * @returns Cleanup callback that removes the listener
   */
  public subscribe(listener: PlaybackSequenceListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());

    return (): void => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * @brief Release sequence timers and subscriptions
   */
  public destroy(): void {
    if (this.advanceTimerId !== null) {
      globalThis.clearTimeout(this.advanceTimerId);
      this.advanceTimerId = null;
    }

    this.removePlaybackVisualReadinessSubscription();
    this.stateListeners.clear();
  }

  /**
   * @brief Schedule the one-time autoplay handoff after the initial frame is visible
   *
   * @param playbackVisualReadinessState - Shared playback readiness snapshot
   */
  private handlePlaybackVisualReadinessState(
    playbackVisualReadinessState: PlaybackVisualReadinessState,
  ): void {
    const nextItem: MediaItem | null = this.getNextItem(this.activeItem);

    if (playbackVisualReadinessState.readiness !== "visualReady") {
      return;
    }

    if (this.activeItem !== this.initialItem) {
      return;
    }

    if (nextItem === null) {
      return;
    }

    if (this.hasScheduledInitialAdvance || this.hasAdvancedFromInitialItem) {
      return;
    }

    this.hasScheduledInitialAdvance = true;
    this.advanceTimerId = globalThis.setTimeout((): void => {
      this.advanceTimerId = null;
      this.hasAdvancedFromInitialItem = true;
      this.advanceToNextItem();
    }, this.advanceDelayMs);
  }

  /**
   * @brief Advance the current active item to the next sequence item
   */
  private advanceToNextItem(): void {
    const nextItem: MediaItem | null = this.getNextItem(this.activeItem);

    if (nextItem === null) {
      return;
    }

    this.activeItem = nextItem;
    this.notifyStateListeners();
  }

  /**
   * @brief Resolve the next featured demo item after the provided item
   *
   * @param currentItem - Current active item in the sequence
   *
   * @returns Next item when one exists, otherwise `null`
   */
  private getNextItem(currentItem: MediaItem | null): MediaItem | null {
    if (currentItem === null) {
      return this.sequenceItems[0] ?? null;
    }

    const currentItemIndex: number = this.sequenceItems.findIndex(
      (sequenceItem: MediaItem): boolean => sequenceItem.id === currentItem.id,
    );

    if (currentItemIndex < 0) {
      return null;
    }

    return this.sequenceItems[currentItemIndex + 1] ?? null;
  }

  /**
   * @brief Notify every registered listener about the current sequence state
   */
  private notifyStateListeners(): void {
    const playbackSequenceState: PlaybackSequenceState = this.getState();

    for (const stateListener of this.stateListeners) {
      stateListener(playbackSequenceState);
    }
  }
}
