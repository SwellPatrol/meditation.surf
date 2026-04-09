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
  MediaSourceDescriptor,
  PlaybackSequenceController,
} from "@meditation-surf/core";

import {
  type WebPreviewSurfaceEntry,
  WebPreviewSurfaceRegistry,
} from "./WebPreviewSurfaceRegistry";

type ShakaModule =
  (typeof import("shaka-player/dist/shaka-player.compiled.js"))["default"];
type ShakaPlayer = InstanceType<ShakaModule["Player"]>;

type ManagedPreviewRuntimeSession = {
  runtimeSessionHandle: MediaRuntimeSessionHandle;
  plannedSessionId: string | null;
  itemId: string | null;
  sourceId: string | null;
  state: MediaExecutionResult["state"];
  hostElement: HTMLDivElement | null;
  videoElement: HTMLVideoElement | null;
  shakaPlayer: ShakaPlayer | null;
};

type ManagedBackgroundRuntimeSession = {
  runtimeSessionHandle: MediaRuntimeSessionHandle;
  plannedSessionId: string | null;
  itemId: string | null;
  state: MediaExecutionResult["state"];
};

/**
 * @brief Thin web runtime adapter for shared media execution commands
 *
 * The web shell now owns one reusable inline preview session and one separate
 * background playback session. The preview session never promotes into the
 * committed background path, which keeps browse previews isolated from the
 * existing fullscreen playback flow.
 */
export class WebMediaRuntimeAdapter implements MediaRuntimeAdapter {
  public static readonly RUNTIME_ID: string = "web-vite";

  private static readonly CAPABILITIES: MediaRuntimeCapabilities = {
    canWarmFirstFrame: true,
    canActivateBackground: true,
    canPreviewInline: true,
    canKeepHiddenWarmSession: true,
    canPromoteWarmSession: false,
    canRunMultipleWarmSessions: false,
  };

  public readonly runtimeId: string;

  private readonly catalog: Catalog;
  private readonly playbackSequenceController: PlaybackSequenceController;
  private readonly previewRuntimeSession: ManagedPreviewRuntimeSession;
  private readonly previewSurfaceRegistry: WebPreviewSurfaceRegistry;
  private readonly backgroundRuntimeSession: ManagedBackgroundRuntimeSession;

  /**
   * @brief Build the web runtime adapter
   *
   * @param catalog - Shared catalog used to resolve items by identifier
   * @param playbackSequenceController - Shared playback sequence controller
   * @param previewSurfaceRegistry - Web-only browse-card preview hosts
   */
  public constructor(
    catalog: Catalog,
    playbackSequenceController: PlaybackSequenceController,
    previewSurfaceRegistry: WebPreviewSurfaceRegistry,
  ) {
    this.runtimeId = WebMediaRuntimeAdapter.RUNTIME_ID;
    this.catalog = catalog;
    this.playbackSequenceController = playbackSequenceController;
    this.previewSurfaceRegistry = previewSurfaceRegistry;
    this.previewRuntimeSession = {
      runtimeSessionHandle: {
        handleId: "preview-session",
        runtimeId: this.runtimeId,
      },
      plannedSessionId: null,
      itemId: null,
      sourceId: null,
      state: "inactive",
      hostElement: null,
      videoElement: null,
      shakaPlayer: null,
    };
    this.backgroundRuntimeSession = {
      runtimeSessionHandle: {
        handleId: "background-session",
        runtimeId: this.runtimeId,
      },
      plannedSessionId: null,
      itemId: null,
      state: "inactive",
    };
    this.previewSurfaceRegistry.subscribe((): void => {
      this.syncActivePreviewSurface();
    });
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
  public async execute(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
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
        return this.handleDeactivateSession(command);
      case "dispose-session":
        return this.handleDisposeSession(command);
    }
  }

  /**
   * @brief Handle preview warming requests
   *
   * @param command - Shared warm command
   *
   * @returns Web execution result
   */
  private async handleWarmSession(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
    const plannedSession: MediaExecutionCommand["session"] = command.session;

    if (plannedSession === null) {
      return this.createResult(
        "unsupported",
        this.previewRuntimeSession.runtimeSessionHandle,
        "Web runtime warm command was missing a planned session.",
      );
    }

    if (plannedSession.role !== "preview") {
      return this.createResult(
        "unsupported",
        this.createRuntimeSessionHandle(plannedSession.role),
        "Web runtime only warms preview sessions in this phase.",
      );
    }

    if (plannedSession.source === null) {
      return this.createResult(
        "failed",
        this.previewRuntimeSession.runtimeSessionHandle,
        `Web runtime could not warm preview session ${plannedSession.sessionId} without a source descriptor.`,
      );
    }

    try {
      await this.preparePreviewSessionForReuse(plannedSession);
      await this.loadPreviewSource(plannedSession.source);
      this.previewRuntimeSession.videoElement?.pause();
      this.previewRuntimeSession.state = "ready-first-frame";

      return this.createResult(
        "ready-first-frame",
        this.previewRuntimeSession.runtimeSessionHandle,
        null,
      );
    } catch (error: unknown) {
      const failureReason: string = this.describeRuntimeError(
        error,
        `Web preview warm failed for ${plannedSession.sessionId}`,
      );

      this.previewRuntimeSession.state = "failed";

      return this.createResult(
        "failed",
        this.previewRuntimeSession.runtimeSessionHandle,
        failureReason,
      );
    }
  }

  /**
   * @brief Handle preview or background activation requests
   *
   * @param command - Shared activate command
   *
   * @returns Web execution result
   */
  private async handleActivateSession(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
    if (command.session?.role === "preview") {
      return this.activatePreviewSession(command);
    }

    return this.activateBackgroundSession(command);
  }

  /**
   * @brief Pause an active runtime session without tearing all resources down
   *
   * @param command - Shared deactivate command
   *
   * @returns Web execution result
   */
  private async handleDeactivateSession(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
    if (command.session?.role === "preview") {
      return this.deactivatePreviewSession(command);
    }

    if (command.session?.role === "background") {
      return this.deactivateBackgroundSession(command);
    }

    return this.createResult("inactive", command.runtimeSessionHandle, null);
  }

  /**
   * @brief Dispose runtime resources owned by an obsolete session
   *
   * @param command - Shared dispose command
   *
   * @returns Web execution result
   */
  private async handleDisposeSession(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
    if (command.session?.role === "preview") {
      return this.disposePreviewSession(command);
    }

    if (command.session?.role === "background") {
      return this.disposeBackgroundSession(command);
    }

    return this.createResult("disposed", command.runtimeSessionHandle, null);
  }

  /**
   * @brief Activate the reusable preview session inside the focused card
   *
   * @param command - Shared activate command for a preview session
   *
   * @returns Web execution result
   */
  private async activatePreviewSession(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
    const plannedSession: MediaExecutionCommand["session"] = command.session;

    if (plannedSession === null || plannedSession.role !== "preview") {
      return this.createResult(
        "unsupported",
        this.previewRuntimeSession.runtimeSessionHandle,
        "Web preview activation requires a preview session.",
      );
    }

    if (
      this.previewRuntimeSession.plannedSessionId !==
        plannedSession.sessionId ||
      this.previewRuntimeSession.itemId !== plannedSession.itemId
    ) {
      return this.createResult(
        "failed",
        this.previewRuntimeSession.runtimeSessionHandle,
        `Web preview activation was asked to use stale session ${plannedSession.sessionId}.`,
      );
    }

    if (this.previewRuntimeSession.videoElement === null) {
      return this.createResult(
        "failed",
        this.previewRuntimeSession.runtimeSessionHandle,
        `Web preview session ${plannedSession.sessionId} has no warmed video element.`,
      );
    }

    this.attachPreviewSurface(plannedSession.itemId);

    try {
      await this.previewRuntimeSession.videoElement.play();
      this.previewRuntimeSession.state = "preview-active";

      return this.createResult(
        "preview-active",
        this.previewRuntimeSession.runtimeSessionHandle,
        null,
      );
    } catch (error: unknown) {
      const failureReason: string = this.describeRuntimeError(
        error,
        `Web preview playback failed for ${plannedSession.sessionId}`,
      );

      this.detachPreviewSurface();
      this.previewRuntimeSession.state = "failed";

      return this.createResult(
        "failed",
        this.previewRuntimeSession.runtimeSessionHandle,
        failureReason,
      );
    }
  }

  /**
   * @brief Activate the committed background playback path
   *
   * @param command - Shared activate command for a background session
   *
   * @returns Web execution result
   */
  private activateBackgroundSession(
    command: MediaExecutionCommand,
  ): MediaExecutionResult {
    const plannedSession: MediaExecutionCommand["session"] = command.session;
    const runtimeSessionHandle: MediaRuntimeSessionHandle =
      this.backgroundRuntimeSession.runtimeSessionHandle;
    const targetItemId: string | null = plannedSession?.itemId ?? null;
    const mediaItem: MediaItem | null = this.resolveMediaItem(targetItemId);

    if (plannedSession?.role !== "background") {
      return this.createResult(
        "unsupported",
        runtimeSessionHandle,
        "Web activation is only wired for preview and background sessions.",
      );
    }

    if (mediaItem === null) {
      return this.createResult(
        "failed",
        runtimeSessionHandle,
        `Web runtime could not resolve media item ${targetItemId ?? "null"}.`,
      );
    }

    this.backgroundRuntimeSession.plannedSessionId = plannedSession.sessionId;
    this.backgroundRuntimeSession.itemId = mediaItem.id;
    this.backgroundRuntimeSession.state = "background-active";

    if (this.playbackSequenceController.getActiveItem()?.id !== mediaItem.id) {
      this.playbackSequenceController.setActiveItem(mediaItem);
    }

    return this.createResult("background-active", runtimeSessionHandle, null);
  }

  /**
   * @brief Pause and hide the reusable preview session
   *
   * @param command - Shared deactivate command
   *
   * @returns Web execution result
   */
  private deactivatePreviewSession(
    command: MediaExecutionCommand,
  ): MediaExecutionResult {
    if (
      !this.matchesPreviewRuntimeSession(command.session?.sessionId ?? null)
    ) {
      return this.createResult(
        "inactive",
        this.previewRuntimeSession.runtimeSessionHandle,
        null,
      );
    }

    this.previewRuntimeSession.videoElement?.pause();
    this.detachPreviewSurface();
    this.previewRuntimeSession.state = "inactive";

    return this.createResult(
      "inactive",
      this.previewRuntimeSession.runtimeSessionHandle,
      null,
    );
  }

  /**
   * @brief Mark the background runtime slot as no longer current
   *
   * @param command - Shared deactivate command
   *
   * @returns Web execution result
   */
  private deactivateBackgroundSession(
    command: MediaExecutionCommand,
  ): MediaExecutionResult {
    if (
      !this.matchesBackgroundRuntimeSession(command.session?.sessionId ?? null)
    ) {
      return this.createResult(
        "inactive",
        this.backgroundRuntimeSession.runtimeSessionHandle,
        null,
      );
    }

    this.backgroundRuntimeSession.state = "inactive";

    return this.createResult(
      "inactive",
      this.backgroundRuntimeSession.runtimeSessionHandle,
      null,
    );
  }

  /**
   * @brief Tear preview resources down when an obsolete session is disposed
   *
   * @param command - Shared dispose command
   *
   * @returns Web execution result
   */
  private async disposePreviewSession(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
    if (
      !this.matchesPreviewRuntimeSession(command.session?.sessionId ?? null)
    ) {
      return this.createResult(
        "inactive",
        this.previewRuntimeSession.runtimeSessionHandle,
        null,
      );
    }

    this.previewRuntimeSession.videoElement?.pause();
    this.detachPreviewSurface();
    await this.destroyPreviewShakaPlayer();
    this.clearVideoElementSource(this.ensurePreviewVideoElement());
    this.previewRuntimeSession.plannedSessionId = null;
    this.previewRuntimeSession.itemId = null;
    this.previewRuntimeSession.sourceId = null;
    this.previewRuntimeSession.state = "disposed";

    return this.createResult(
      "disposed",
      this.previewRuntimeSession.runtimeSessionHandle,
      null,
    );
  }

  /**
   * @brief Mark the background slot as disposed without changing playback state
   *
   * @param command - Shared dispose command
   *
   * @returns Web execution result
   */
  private disposeBackgroundSession(
    command: MediaExecutionCommand,
  ): MediaExecutionResult {
    if (
      !this.matchesBackgroundRuntimeSession(command.session?.sessionId ?? null)
    ) {
      return this.createResult(
        "inactive",
        this.backgroundRuntimeSession.runtimeSessionHandle,
        null,
      );
    }

    this.backgroundRuntimeSession.plannedSessionId = null;
    this.backgroundRuntimeSession.itemId = null;
    this.backgroundRuntimeSession.state = "disposed";

    return this.createResult(
      "disposed",
      this.backgroundRuntimeSession.runtimeSessionHandle,
      null,
    );
  }

  /**
   * @brief Prepare the reusable preview slot for a new focused item
   *
   * @param plannedSession - Preview session currently being warmed
   */
  private async preparePreviewSessionForReuse(
    plannedSession: NonNullable<MediaExecutionCommand["session"]>,
  ): Promise<void> {
    this.previewRuntimeSession.videoElement?.pause();
    this.detachPreviewSurface();
    await this.destroyPreviewShakaPlayer();
    this.clearVideoElementSource(this.ensurePreviewVideoElement());
    this.previewRuntimeSession.plannedSessionId = plannedSession.sessionId;
    this.previewRuntimeSession.itemId = plannedSession.itemId;
    this.previewRuntimeSession.sourceId =
      plannedSession.source?.sourceId ?? null;
    this.previewRuntimeSession.state = "warming-first-frame";
  }

  /**
   * @brief Load the preview source and wait until the first frame is ready
   *
   * @param sourceDescriptor - Shared source descriptor for the focused item
   */
  private async loadPreviewSource(
    sourceDescriptor: MediaSourceDescriptor,
  ): Promise<void> {
    const videoElement: HTMLVideoElement = this.ensurePreviewVideoElement();
    const playbackMimeType: string =
      sourceDescriptor.mimeType ?? "application/x-mpegURL";
    const canUseNativeHlsPlayback: boolean =
      videoElement.canPlayType(playbackMimeType) !== "";
    const readyForFirstFramePromise: Promise<void> =
      this.waitForLoadedData(videoElement);

    videoElement.poster = sourceDescriptor.posterUrl ?? "";

    if (canUseNativeHlsPlayback) {
      videoElement.src = sourceDescriptor.url;
      videoElement.load();
      await readyForFirstFramePromise;
      return;
    }

    const shakaModule: { default: ShakaModule } =
      await import("shaka-player/dist/shaka-player.compiled.js");
    const shaka: ShakaModule = shakaModule.default;

    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      throw new Error("Shaka Player is not supported in this browser.");
    }

    const shakaPlayer: ShakaPlayer = new shaka.Player(videoElement);

    this.previewRuntimeSession.shakaPlayer = shakaPlayer;
    await shakaPlayer.load(sourceDescriptor.url);
    await readyForFirstFramePromise;
  }

  /**
   * @brief Keep the active preview attached to the latest rerendered card host
   */
  private syncActivePreviewSurface(): void {
    if (this.previewRuntimeSession.state !== "preview-active") {
      return;
    }

    this.attachPreviewSurface(this.previewRuntimeSession.itemId);
  }

  /**
   * @brief Attach the warmed preview element to the current browse card host
   *
   * @param itemId - Focused item that should host the preview video
   */
  private attachPreviewSurface(itemId: string | null): void {
    const videoElement: HTMLVideoElement | null =
      this.previewRuntimeSession.videoElement;
    const surfaceEntry: WebPreviewSurfaceEntry | null =
      this.previewSurfaceRegistry.getEntry(itemId);

    if (videoElement === null || surfaceEntry === null) {
      this.detachPreviewSurface();
      return;
    }

    if (this.previewRuntimeSession.hostElement === surfaceEntry.hostElement) {
      surfaceEntry.hostElement.classList.add("is-active");
      return;
    }

    this.detachPreviewSurface();
    surfaceEntry.hostElement.replaceChildren(videoElement);
    surfaceEntry.hostElement.classList.add("is-active");
    this.previewRuntimeSession.hostElement = surfaceEntry.hostElement;
  }

  /**
   * @brief Remove the preview element from the current browse card host
   */
  private detachPreviewSurface(): void {
    const hostElement: HTMLDivElement | null =
      this.previewRuntimeSession.hostElement;
    const videoElement: HTMLVideoElement | null =
      this.previewRuntimeSession.videoElement;

    if (hostElement !== null) {
      hostElement.classList.remove("is-active");

      if (videoElement !== null && videoElement.parentElement === hostElement) {
        hostElement.replaceChildren();
      }
    }

    this.previewRuntimeSession.hostElement = null;
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
   * @brief Ensure the reusable preview element exists with stable configuration
   *
   * @returns Preview video element used across focused items
   */
  private ensurePreviewVideoElement(): HTMLVideoElement {
    if (this.previewRuntimeSession.videoElement !== null) {
      return this.previewRuntimeSession.videoElement;
    }

    const videoElement: HTMLVideoElement = document.createElement("video");

    videoElement.autoplay = false;
    videoElement.className = "browse-thumbnail-preview-video";
    videoElement.controls = false;
    videoElement.crossOrigin = "anonymous";
    videoElement.defaultMuted = true;
    videoElement.disablePictureInPicture = true;
    videoElement.loop = false;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.preload = "auto";
    videoElement.setAttribute("aria-hidden", "true");
    videoElement.setAttribute("crossorigin", "anonymous");
    videoElement.setAttribute("muted", "");
    videoElement.setAttribute("playsinline", "");

    this.previewRuntimeSession.videoElement = videoElement;

    return videoElement;
  }

  /**
   * @brief Destroy any active Shaka player owned by the preview slot
   */
  private async destroyPreviewShakaPlayer(): Promise<void> {
    if (this.previewRuntimeSession.shakaPlayer === null) {
      return;
    }

    const shakaPlayer: ShakaPlayer = this.previewRuntimeSession.shakaPlayer;

    this.previewRuntimeSession.shakaPlayer = null;
    await shakaPlayer.destroy();
  }

  /**
   * @brief Reset a video element back to an unloaded state
   *
   * @param videoElement - Video element that should release its current source
   */
  private clearVideoElementSource(videoElement: HTMLVideoElement): void {
    videoElement.pause();
    videoElement.removeAttribute("src");
    videoElement.load();
  }

  /**
   * @brief Wait until the browser reports that the first frame is displayable
   *
   * @param videoElement - Video element being warmed
   *
   * @returns Promise resolved after `loadeddata` fires once
   */
  private waitForLoadedData(videoElement: HTMLVideoElement): Promise<void> {
    return new Promise<void>(
      (resolve: () => void, reject: (error: Error) => void): void => {
        const handleLoadedData = (): void => {
          cleanupListeners();
          resolve();
        };
        const handleError = (): void => {
          cleanupListeners();
          reject(new Error("The browser failed to load preview media data."));
        };
        const cleanupListeners = (): void => {
          videoElement.removeEventListener("loadeddata", handleLoadedData);
          videoElement.removeEventListener("error", handleError);
        };

        videoElement.addEventListener("loadeddata", handleLoadedData, {
          once: true,
        });
        videoElement.addEventListener("error", handleError, {
          once: true,
        });
      },
    );
  }

  /**
   * @brief Resolve the runtime slot handle associated with one logical role
   *
   * @param role - Logical role associated with the runtime slot
   *
   * @returns Stable runtime slot handle
   */
  private createRuntimeSessionHandle(
    role: string | null,
  ): MediaRuntimeSessionHandle | null {
    if (role === "preview") {
      return this.previewRuntimeSession.runtimeSessionHandle;
    }

    if (role === "background") {
      return this.backgroundRuntimeSession.runtimeSessionHandle;
    }

    return null;
  }

  /**
   * @brief Determine whether one cleanup command still targets the live preview slot
   *
   * @param sessionId - Planned session identifier supplied by the command
   *
   * @returns `true` when the command still matches the reusable preview slot
   */
  private matchesPreviewRuntimeSession(sessionId: string | null): boolean {
    return (
      sessionId !== null &&
      this.previewRuntimeSession.plannedSessionId === sessionId
    );
  }

  /**
   * @brief Determine whether one cleanup command still targets the live background slot
   *
   * @param sessionId - Planned session identifier supplied by the command
   *
   * @returns `true` when the command still matches the background slot
   */
  private matchesBackgroundRuntimeSession(sessionId: string | null): boolean {
    return (
      sessionId !== null &&
      this.backgroundRuntimeSession.plannedSessionId === sessionId
    );
  }

  /**
   * @brief Normalize runtime errors into readable failure messages
   *
   * @param error - Runtime error thrown by the browser or player path
   * @param fallbackMessage - Message used when the error is not descriptive
   *
   * @returns Human-readable failure reason
   */
  private describeRuntimeError(
    error: unknown,
    fallbackMessage: string,
  ): string {
    return error instanceof Error && error.message.length > 0
      ? `${fallbackMessage}: ${error.message}`
      : fallbackMessage;
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
