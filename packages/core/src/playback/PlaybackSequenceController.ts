/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { CommittedPlaybackDecision } from "@meditation-surf/media";

import type { Catalog } from "../catalog/Catalog";
import type { CatalogSection } from "../catalog/CatalogSection";
import type { MediaItem } from "../catalog/MediaItem";

/**
 * @brief Snapshot describing the currently active shared playback item
 */
export type PlaybackSequenceState = {
  activeItem: MediaItem | null;
  committedPlaybackDecision: CommittedPlaybackDecision | null;
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
  private committedPlaybackDecision: CommittedPlaybackDecision | null;

  /**
   * @brief Create the playback sequence controller for the featured demo item
   *
   * @param catalog - Shared catalog whose featured section defines the active item
   */
  public constructor(catalog: Catalog) {
    const featuredSection: CatalogSection | null = catalog.getFeaturedSection();
    const featuredItems: MediaItem[] = featuredSection?.getItems() ?? [];

    this.activeItem = featuredItems[0] ?? null;
    this.committedPlaybackDecision = null;
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
      committedPlaybackDecision: this.cloneCommittedPlaybackDecision(
        this.committedPlaybackDecision,
      ),
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
   * @brief Return the current committed playback decision, when one exists
   *
   * @returns Current committed playback decision, or `null` when unset
   */
  public getCommittedPlaybackDecision(): CommittedPlaybackDecision | null {
    return this.cloneCommittedPlaybackDecision(this.committedPlaybackDecision);
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
    if (
      this.activeItem === activeItem &&
      this.committedPlaybackDecision === null
    ) {
      return;
    }

    this.activeItem = activeItem;
    this.committedPlaybackDecision = null;
    this.notifyStateListeners();
  }

  /**
   * @brief Replace the active item together with its committed playback policy
   *
   * @param activeItem - Media item that should become active
   * @param committedPlaybackDecision - Committed playback decision for that item
   */
  public setCommittedPlayback(
    activeItem: MediaItem | null,
    committedPlaybackDecision: CommittedPlaybackDecision | null,
  ): void {
    if (
      this.activeItem === activeItem &&
      this.areCommittedPlaybackDecisionsEqual(
        this.committedPlaybackDecision,
        committedPlaybackDecision,
      )
    ) {
      return;
    }

    this.activeItem = activeItem;
    this.committedPlaybackDecision = this.cloneCommittedPlaybackDecision(
      committedPlaybackDecision,
    );
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

  /**
   * @brief Clone one committed playback decision for read-only consumers
   *
   * @param committedPlaybackDecision - Decision to clone
   *
   * @returns Cloned decision, or `null` when absent
   */
  private cloneCommittedPlaybackDecision(
    committedPlaybackDecision: CommittedPlaybackDecision | null,
  ): CommittedPlaybackDecision | null {
    if (committedPlaybackDecision === null) {
      return null;
    }

    return {
      mode: committedPlaybackDecision.mode,
      preferredLane: committedPlaybackDecision.preferredLane,
      chosenLane: committedPlaybackDecision.chosenLane,
      preferredRendererKind: committedPlaybackDecision.preferredRendererKind,
      fallbackOrder: [...committedPlaybackDecision.fallbackOrder],
      reasons: [...committedPlaybackDecision.reasons],
      reasonDetails: [...committedPlaybackDecision.reasonDetails],
      audioActivationMode: committedPlaybackDecision.audioActivationMode,
      usedPreferredLane: committedPlaybackDecision.usedPreferredLane,
      usedFallbackLane: committedPlaybackDecision.usedFallbackLane,
      lanePreference: committedPlaybackDecision.lanePreference,
      startPositionSeconds: committedPlaybackDecision.startPositionSeconds,
    };
  }

  /**
   * @brief Compare two committed playback decisions for state-change detection
   *
   * @param leftCommittedPlaybackDecision - Previous decision
   * @param rightCommittedPlaybackDecision - Next decision
   *
   * @returns `true` when both decisions are effectively identical
   */
  private areCommittedPlaybackDecisionsEqual(
    leftCommittedPlaybackDecision: CommittedPlaybackDecision | null,
    rightCommittedPlaybackDecision: CommittedPlaybackDecision | null,
  ): boolean {
    if (
      leftCommittedPlaybackDecision === null ||
      rightCommittedPlaybackDecision === null
    ) {
      return leftCommittedPlaybackDecision === rightCommittedPlaybackDecision;
    }

    return (
      leftCommittedPlaybackDecision.mode ===
        rightCommittedPlaybackDecision.mode &&
      leftCommittedPlaybackDecision.preferredLane ===
        rightCommittedPlaybackDecision.preferredLane &&
      leftCommittedPlaybackDecision.chosenLane ===
        rightCommittedPlaybackDecision.chosenLane &&
      leftCommittedPlaybackDecision.preferredRendererKind ===
        rightCommittedPlaybackDecision.preferredRendererKind &&
      leftCommittedPlaybackDecision.audioActivationMode ===
        rightCommittedPlaybackDecision.audioActivationMode &&
      leftCommittedPlaybackDecision.usedPreferredLane ===
        rightCommittedPlaybackDecision.usedPreferredLane &&
      leftCommittedPlaybackDecision.usedFallbackLane ===
        rightCommittedPlaybackDecision.usedFallbackLane &&
      leftCommittedPlaybackDecision.lanePreference ===
        rightCommittedPlaybackDecision.lanePreference &&
      leftCommittedPlaybackDecision.startPositionSeconds ===
        rightCommittedPlaybackDecision.startPositionSeconds &&
      JSON.stringify(leftCommittedPlaybackDecision.fallbackOrder) ===
        JSON.stringify(rightCommittedPlaybackDecision.fallbackOrder) &&
      JSON.stringify(leftCommittedPlaybackDecision.reasons) ===
        JSON.stringify(rightCommittedPlaybackDecision.reasons) &&
      JSON.stringify(leftCommittedPlaybackDecision.reasonDetails) ===
        JSON.stringify(rightCommittedPlaybackDecision.reasonDetails)
    );
  }
}
