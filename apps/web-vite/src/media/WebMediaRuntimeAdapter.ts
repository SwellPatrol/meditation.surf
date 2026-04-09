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
 * @brief Thin web runtime adapter for shared media execution commands
 *
 * Background activation is forwarded into the existing playback-sequence path.
 * Preview warming remains conservative until a safe hidden warm session exists.
 */
export class WebMediaRuntimeAdapter implements MediaRuntimeAdapter {
  public static readonly RUNTIME_ID: string = "web-vite";

  private static readonly CAPABILITIES: MediaRuntimeCapabilities = {
    canWarmFirstFrame: true,
    canActivateBackground: true,
    canPreviewInline: false,
    canKeepHiddenWarmSession: true,
    canPromoteWarmSession: false,
    canRunMultipleWarmSessions: false,
  };

  public readonly runtimeId: string;

  private readonly catalog: Catalog;
  private readonly playbackSequenceController: PlaybackSequenceController;

  /**
   * @brief Build the web runtime adapter
   *
   * @param catalog - Shared catalog used to resolve items by identifier
   * @param playbackSequenceController - Shared playback sequence controller
   */
  public constructor(
    catalog: Catalog,
    playbackSequenceController: PlaybackSequenceController,
  ) {
    this.runtimeId = WebMediaRuntimeAdapter.RUNTIME_ID;
    this.catalog = catalog;
    this.playbackSequenceController = playbackSequenceController;
  }

  /**
   * @brief Report the current web runtime execution capabilities
   *
   * @returns Web runtime capability snapshot
   */
  public getCapabilities(): MediaRuntimeCapabilities {
    return {
      ...WebMediaRuntimeAdapter.CAPABILITIES,
    };
  }

  /**
   * @brief Execute one shared runtime command on the web shell
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
        return this.handleWarmSession(command);
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
   * @brief Handle preview or background warming requests
   *
   * @param command - Shared warm command
   *
   * @returns Web execution result
   */
  private handleWarmSession(
    command: MediaExecutionCommand,
  ): MediaExecutionResult {
    const runtimeSessionHandle: MediaRuntimeSessionHandle =
      this.createRuntimeSessionHandle(command);

    if (command.session === null) {
      return this.createResult(
        "unsupported",
        runtimeSessionHandle,
        "Web runtime warm command was missing a planned session.",
      );
    }

    if (command.session.role === "background") {
      return this.createResult("warmed", runtimeSessionHandle, null);
    }

    return this.createResult(
      "unsupported",
      runtimeSessionHandle,
      "Web preview warming is not connected to a safe hidden player path yet.",
    );
  }

  /**
   * @brief Handle background activation requests
   *
   * @param command - Shared activate command
   *
   * @returns Web execution result
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
        "Web activation is only wired for background sessions in this phase.",
      );
    }

    if (mediaItem === null) {
      return this.createResult(
        "failed",
        runtimeSessionHandle,
        `Web runtime could not resolve media item ${targetItemId ?? "null"}.`,
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
   * @brief Build one web execution result
   *
   * @param state - Execution state being reported
   * @param runtimeSessionHandle - Runtime-owned session handle
   * @param failureReason - Optional failure or unsupported reason
   *
   * @returns Web execution result
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
