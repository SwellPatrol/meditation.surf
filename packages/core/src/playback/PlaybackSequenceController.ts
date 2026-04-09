/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

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
 * @brief Coordinate the current demo item exposed to playback consumers
 *
 * The demo experience currently pins playback to the catalog's featured item.
 * Apps subscribe here so every platform reads the same active-item snapshot.
 */
export class PlaybackSequenceController {
  private readonly stateListeners: Set<PlaybackSequenceListener>;
  private activeItem: MediaItem | null;

  /**
   * @brief Create the playback sequence controller for the featured demo item
   *
   * @param catalog - Shared catalog whose featured section defines the active item
   */
  public constructor(catalog: Catalog) {
    const featuredSection: CatalogSection | null = catalog.getFeaturedSection();
    const featuredItems: MediaItem[] = featuredSection?.getItems() ?? [];

    this.activeItem = featuredItems[0] ?? null;
    this.stateListeners = new Set<PlaybackSequenceListener>();
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
   * @brief Release sequence subscriptions
   */
  public destroy(): void {
    this.stateListeners.clear();
  }

  /**
   * @brief Replace the current playback item when activation changes it
   *
   * @param activeItem - Media item that should become active
   */
  public setActiveItem(activeItem: MediaItem | null): void {
    if (this.activeItem === activeItem) {
      return;
    }

    this.activeItem = activeItem;
    this.notifyStateListeners();
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
