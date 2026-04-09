/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  Catalog,
  MediaExecutionCommand,
  MediaExecutionResult,
  MediaItem,
  MediaRuntimeAdapter,
  MediaRuntimeCapabilities,
  MediaRuntimeSessionHandle,
  PlaybackSequenceController,
} from "@meditation-surf/core";

/**
 * @brief Thin Expo runtime adapter for shared media execution commands
 *
 * Expo currently uses the shared playback sequence to drive background video.
 * Preview warming remains unsupported until a dedicated warm path exists.
 */
export class ExpoMediaRuntimeAdapter implements MediaRuntimeAdapter {
  public static readonly RUNTIME_ID: string = "mobile-expo";

  private static readonly CAPABILITIES: MediaRuntimeCapabilities = {
    canWarmFirstFrame: false,
    canActivateBackground: true,
    canPreviewInline: false,
    canKeepHiddenWarmSession: false,
    canPromoteWarmSession: false,
    canRunMultipleWarmSessions: false,
  };

  public readonly runtimeId: string;

  private readonly catalog: Catalog;
  private readonly playbackSequenceController: PlaybackSequenceController;

  /**
   * @brief Build the Expo runtime adapter
   *
   * @param catalog - Shared catalog used to resolve items by identifier
   * @param playbackSequenceController - Shared playback sequence controller
   */
  public constructor(
    catalog: Catalog,
    playbackSequenceController: PlaybackSequenceController,
  ) {
    this.runtimeId = ExpoMediaRuntimeAdapter.RUNTIME_ID;
    this.catalog = catalog;
    this.playbackSequenceController = playbackSequenceController;
  }

  /**
   * @brief Report the current Expo runtime execution capabilities
   *
   * @returns Expo runtime capability snapshot
   */
  public getCapabilities(): MediaRuntimeCapabilities {
    return {
      ...ExpoMediaRuntimeAdapter.CAPABILITIES,
    };
  }

  /**
   * @brief Execute one shared runtime command on Expo
   *
   * @param command - Shared execution command emitted by the media kernel
   *
   * @returns Runtime result reported back to the shared executor
   */
  public execute(command: MediaExecutionCommand): MediaExecutionResult {
    switch (command.type) {
      case "sync-plan":
        return this.createResult(
          "inactive",
          command.runtimeSessionHandle,
          null,
        );
      case "warm-session":
        return this.createResult(
          "unsupported",
          this.createRuntimeSessionHandle(command),
          "Expo preview warming is not implemented in this phase.",
        );
      case "activate-session":
        return this.handleActivateSession(command);
      case "deactivate-session":
      case "dispose-session":
        return this.createResult(
          "inactive",
          command.runtimeSessionHandle,
          null,
        );
    }
  }

  /**
   * @brief Handle background activation requests
   *
   * @param command - Shared activate command
   *
   * @returns Expo execution result
   */
  private handleActivateSession(
    command: MediaExecutionCommand,
  ): MediaExecutionResult {
    const runtimeSessionHandle: MediaRuntimeSessionHandle =
      this.createRuntimeSessionHandle(command);
    const targetItemId: string | null = command.session?.itemId ?? null;
    const mediaItem: MediaItem | null = this.resolveMediaItem(targetItemId);

    if (command.session?.role !== "background") {
      return this.createResult(
        "unsupported",
        runtimeSessionHandle,
        "Expo activation is only wired for background sessions in this phase.",
      );
    }

    if (mediaItem === null) {
      return this.createResult(
        "failed",
        runtimeSessionHandle,
        `Expo runtime could not resolve media item ${targetItemId ?? "null"}.`,
      );
    }

    if (this.playbackSequenceController.getActiveItem()?.id !== mediaItem.id) {
      this.playbackSequenceController.setActiveItem(mediaItem);
    }

    return this.createResult("active", runtimeSessionHandle, null);
  }

  /**
   * @brief Resolve a shared media item from the catalog
   *
   * @param itemId - Stable item identifier
   *
   * @returns Matching media item, or `null` when none exists
   */
  private resolveMediaItem(itemId: string | null): MediaItem | null {
    if (itemId === null) {
      return null;
    }

    for (const catalogSection of this.catalog.getSections()) {
      const mediaItem: MediaItem | undefined = catalogSection
        .getItems()
        .find(
          (candidateMediaItem: MediaItem): boolean =>
            candidateMediaItem.id === itemId,
        );

      if (mediaItem !== undefined) {
        return mediaItem;
      }
    }

    return null;
  }

  /**
   * @brief Build a lightweight runtime-owned session handle
   *
   * @param command - Shared execution command
   *
   * @returns Runtime-owned session handle
   */
  private createRuntimeSessionHandle(
    command: MediaExecutionCommand,
  ): MediaRuntimeSessionHandle {
    return {
      handleId: command.session?.sessionId ?? "global",
      runtimeId: this.runtimeId,
    };
  }

  /**
   * @brief Build one Expo execution result
   *
   * @param state - Execution state being reported
   * @param runtimeSessionHandle - Runtime-owned session handle
   * @param failureReason - Optional failure or unsupported reason
   *
   * @returns Expo execution result
   */
  private createResult(
    state: MediaExecutionResult["state"],
    runtimeSessionHandle: MediaRuntimeSessionHandle | null,
    failureReason: string | null,
  ): MediaExecutionResult {
    return {
      state,
      runtimeSessionHandle,
      failureReason,
    };
  }
}
