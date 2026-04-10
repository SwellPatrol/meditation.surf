/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  Catalog,
  CommittedPlaybackDecision,
  MediaExecutionCommand,
  MediaExecutionResult,
  MediaItem,
  MediaPlaybackLane,
  MediaRuntimeAdapter,
  MediaRuntimeCapabilities,
  MediaRuntimeSessionHandle,
  MediaSourceDescriptor,
  MediaStartupDebugState,
  PlaybackSequenceController,
} from "@meditation-surf/core";
import { type StartupWarmResult, VfsController } from "@meditation-surf/vfs";

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
 * The web shell now owns a small preview pool plus one separate background
 * playback session. Preview slots stay isolated from the committed background
 * path so browse previews never promote into fullscreen playback.
 */
export class WebMediaRuntimeAdapter implements MediaRuntimeAdapter {
  public static readonly RUNTIME_ID: string = "web-vite";
  private static readonly PREVIEW_POOL_SIZE: number = 3;

  private static readonly CAPABILITIES: MediaRuntimeCapabilities = {
    canWarmFirstFrame: true,
    canActivateBackground: true,
    canPreviewInline: true,
    canKeepHiddenWarmSession: true,
    canPromoteWarmSession: false,
    canRunMultipleWarmSessions: true,
    supportsCommittedPlayback: true,
    supportsCommittedPlaybackAudio: true,
    supportsFallbackStereoAudio: true,
    supportsPremiumCommittedPlayback: true,
    supportsPremiumAudioActivation: false,
    committedPlaybackLanePreference: "prefer-native",
    committedPlaybackLanes: ["native", "shaka"],
    existingBackgroundPlaybackLane: "native",
    previewSchedulerBudget: {
      maxWarmSessions: 3,
      maxActivePreviewSessions: 1,
      maxHiddenSessions: 2,
      maxPreviewReuseMs: 5000,
      maxPreviewOverlapMs: 0,
      keepWarmAfterBlurMs: 2500,
    },
  };

  public readonly runtimeId: string;

  private readonly catalog: Catalog;
  private readonly playbackSequenceController: PlaybackSequenceController;
  private readonly previewRuntimeSessions: ManagedPreviewRuntimeSession[];
  private readonly previewSurfaceRegistry: WebPreviewSurfaceRegistry;
  private readonly backgroundRuntimeSession: ManagedBackgroundRuntimeSession;
  private readonly vfsController: VfsController;

  /**
   * @brief Build the web runtime adapter
   *
   * @param catalog - Shared catalog used to resolve items by identifier
   * @param playbackSequenceController - Shared playback sequence controller
   * @param previewSurfaceRegistry - Web-only browse-card preview hosts
   * @param vfsController - Shared VFS controller used for startup warming
   */
  public constructor(
    catalog: Catalog,
    playbackSequenceController: PlaybackSequenceController,
    previewSurfaceRegistry: WebPreviewSurfaceRegistry,
    vfsController: VfsController,
  ) {
    this.runtimeId = WebMediaRuntimeAdapter.RUNTIME_ID;
    this.catalog = catalog;
    this.playbackSequenceController = playbackSequenceController;
    this.previewSurfaceRegistry = previewSurfaceRegistry;
    this.vfsController = vfsController;
    this.previewRuntimeSessions = this.createPreviewRuntimeSessions();
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
      this.syncActivePreviewSurfaces();
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
      committedPlaybackLanes: [
        ...WebMediaRuntimeAdapter.CAPABILITIES.committedPlaybackLanes,
      ],
      previewSchedulerBudget: {
        maxWarmSessions:
          WebMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxWarmSessions,
        maxActivePreviewSessions:
          WebMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxActivePreviewSessions,
        maxHiddenSessions:
          WebMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxHiddenSessions,
        maxPreviewReuseMs:
          WebMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxPreviewReuseMs,
        maxPreviewOverlapMs:
          WebMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxPreviewOverlapMs,
        keepWarmAfterBlurMs:
          WebMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .keepWarmAfterBlurMs,
      },
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
        command.runtimeSessionHandle,
        null,
        "Web runtime warm command was missing a planned session.",
      );
    }

    if (plannedSession.role !== "preview") {
      return this.createResult(
        "unsupported",
        command.runtimeSessionHandle,
        null,
        "Web runtime only warms preview sessions in this phase.",
      );
    }

    if (plannedSession.source === null) {
      return this.createResult(
        "failed",
        command.runtimeSessionHandle,
        null,
        `Web runtime could not warm preview session ${plannedSession.sessionId} without a source descriptor.`,
      );
    }

    const previewRuntimeSession: ManagedPreviewRuntimeSession | null =
      this.resolvePreviewRuntimeSession(command, plannedSession);

    if (previewRuntimeSession === null) {
      return this.createResult(
        "failed",
        command.runtimeSessionHandle,
        null,
        `Web runtime could not allocate a preview slot for ${plannedSession.sessionId}.`,
      );
    }

    if (
      previewRuntimeSession.plannedSessionId === plannedSession.sessionId &&
      previewRuntimeSession.sourceId === plannedSession.source.sourceId &&
      (previewRuntimeSession.state === "ready-first-frame" ||
        previewRuntimeSession.state === "preview-active")
    ) {
      return this.createResult(
        previewRuntimeSession.state,
        previewRuntimeSession.runtimeSessionHandle,
        null,
        null,
      );
    }

    try {
      const startupDebugState: MediaStartupDebugState | null =
        await this.buildStartupDebugState(
          "preview-warm",
          plannedSession.source,
        );
      await this.preparePreviewSessionForReuse(
        previewRuntimeSession,
        plannedSession,
      );
      await this.loadPreviewSource(previewRuntimeSession, plannedSession);
      previewRuntimeSession.videoElement?.pause();
      previewRuntimeSession.state = "ready-first-frame";

      return this.createResult(
        "ready-first-frame",
        previewRuntimeSession.runtimeSessionHandle,
        null,
        null,
        startupDebugState,
      );
    } catch (error: unknown) {
      const failureReason: string = this.describeRuntimeError(
        error,
        `Web preview warm failed for ${plannedSession.sessionId}`,
      );

      previewRuntimeSession.state = "failed";

      return this.createResult(
        "failed",
        previewRuntimeSession.runtimeSessionHandle,
        null,
        failureReason,
        await this.buildStartupDebugState(
          "preview-warm",
          plannedSession.source,
          failureReason,
        ),
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

    return this.createResult(
      "inactive",
      command.runtimeSessionHandle,
      null,
      null,
    );
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

    return this.createResult(
      "disposed",
      command.runtimeSessionHandle,
      null,
      null,
    );
  }

  /**
   * @brief Activate one preview slot inside the focused card
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
        command.runtimeSessionHandle,
        null,
        "Web preview activation requires a preview session.",
      );
    }

    const previewRuntimeSession: ManagedPreviewRuntimeSession | null =
      this.findPreviewRuntimeSession(plannedSession.sessionId, command);

    if (previewRuntimeSession === null) {
      return this.createResult(
        "failed",
        command.runtimeSessionHandle,
        null,
        `Web preview activation could not resolve slot ${plannedSession.sessionId}.`,
      );
    }

    if (previewRuntimeSession.videoElement === null) {
      return this.createResult(
        "failed",
        previewRuntimeSession.runtimeSessionHandle,
        null,
        `Web preview session ${plannedSession.sessionId} has no warmed video element.`,
      );
    }

    this.deactivateOtherActivePreviewSessions(plannedSession.sessionId);
    this.attachPreviewSurface(previewRuntimeSession, plannedSession.itemId);

    try {
      await previewRuntimeSession.videoElement.play();
      previewRuntimeSession.state = "preview-active";

      return this.createResult(
        "preview-active",
        previewRuntimeSession.runtimeSessionHandle,
        null,
        null,
      );
    } catch (error: unknown) {
      const failureReason: string = this.describeRuntimeError(
        error,
        `Web preview playback failed for ${plannedSession.sessionId}`,
      );

      this.detachPreviewSurface(previewRuntimeSession);
      previewRuntimeSession.state = "failed";

      return this.createResult(
        "failed",
        previewRuntimeSession.runtimeSessionHandle,
        null,
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
  private async activateBackgroundSession(
    command: MediaExecutionCommand,
  ): Promise<MediaExecutionResult> {
    const plannedSession: MediaExecutionCommand["session"] = command.session;
    const runtimeSessionHandle: MediaRuntimeSessionHandle =
      this.backgroundRuntimeSession.runtimeSessionHandle;
    const targetItemId: string | null = plannedSession?.itemId ?? null;
    const mediaItem: MediaItem | null = this.resolveMediaItem(targetItemId);
    const committedPlaybackDecision: CommittedPlaybackDecision | null =
      this.resolveCommittedPlaybackDecision(command);

    if (plannedSession?.role !== "background") {
      return this.createResult(
        "unsupported",
        runtimeSessionHandle,
        committedPlaybackDecision,
        "Web activation is only wired for preview and background sessions.",
      );
    }

    if (mediaItem === null) {
      return this.createResult(
        "failed",
        runtimeSessionHandle,
        committedPlaybackDecision,
        `Web runtime could not resolve media item ${targetItemId ?? "null"}.`,
      );
    }

    this.backgroundRuntimeSession.plannedSessionId = plannedSession.sessionId;
    this.backgroundRuntimeSession.itemId = mediaItem.id;
    this.backgroundRuntimeSession.state = "waiting-first-frame";
    this.playbackSequenceController.setCommittedPlayback(
      mediaItem,
      committedPlaybackDecision,
    );

    return this.createResult(
      "waiting-first-frame",
      runtimeSessionHandle,
      committedPlaybackDecision,
      null,
      await this.buildStartupDebugState(
        "committed-playback-startup",
        plannedSession.source,
      ),
    );
  }

  /**
   * @brief Pause and hide one active preview while keeping it warm when possible
   *
   * @param command - Shared deactivate command
   *
   * @returns Web execution result
   */
  private deactivatePreviewSession(
    command: MediaExecutionCommand,
  ): MediaExecutionResult {
    const previewRuntimeSession: ManagedPreviewRuntimeSession | null =
      this.findPreviewRuntimeSession(
        command.session?.sessionId ?? null,
        command,
      );

    if (previewRuntimeSession === null) {
      return this.createResult(
        "inactive",
        command.runtimeSessionHandle,
        null,
        null,
      );
    }

    previewRuntimeSession.videoElement?.pause();
    this.detachPreviewSurface(previewRuntimeSession);
    previewRuntimeSession.state =
      previewRuntimeSession.videoElement !== null &&
      previewRuntimeSession.sourceId !== null
        ? "ready-first-frame"
        : "inactive";

    return this.createResult(
      previewRuntimeSession.state,
      previewRuntimeSession.runtimeSessionHandle,
      null,
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
      this.backgroundRuntimeSession.plannedSessionId !==
      (command.session?.sessionId ?? null)
    ) {
      return this.createResult(
        "inactive",
        this.backgroundRuntimeSession.runtimeSessionHandle,
        null,
        null,
      );
    }

    this.backgroundRuntimeSession.state = "inactive";

    return this.createResult(
      "inactive",
      this.backgroundRuntimeSession.runtimeSessionHandle,
      null,
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
    const previewRuntimeSession: ManagedPreviewRuntimeSession | null =
      this.findPreviewRuntimeSession(
        command.session?.sessionId ?? null,
        command,
      );

    if (previewRuntimeSession === null) {
      return this.createResult(
        "inactive",
        command.runtimeSessionHandle,
        null,
        null,
      );
    }

    await this.resetPreviewRuntimeSession(previewRuntimeSession);
    previewRuntimeSession.state = "disposed";

    return this.createResult(
      "disposed",
      previewRuntimeSession.runtimeSessionHandle,
      null,
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
      this.backgroundRuntimeSession.plannedSessionId !==
      (command.session?.sessionId ?? null)
    ) {
      return this.createResult(
        "inactive",
        this.backgroundRuntimeSession.runtimeSessionHandle,
        null,
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
      null,
    );
  }

  /**
   * @brief Resolve the actual committed background lane supported by the browser
   *
   * @param command - Shared activate command carrying the chosen decision
   *
   * @returns Runtime-adjusted committed playback decision, or `null` when absent
   */
  private resolveCommittedPlaybackDecision(
    command: MediaExecutionCommand,
  ): CommittedPlaybackDecision | null {
    const committedPlaybackDecision: CommittedPlaybackDecision | null =
      command.committedPlaybackDecision;
    const sourceDescriptor: MediaSourceDescriptor | null =
      command.session?.source ?? null;

    if (
      committedPlaybackDecision === null ||
      sourceDescriptor === null ||
      committedPlaybackDecision.chosenLane !== "native"
    ) {
      return committedPlaybackDecision;
    }

    const videoElement: HTMLVideoElement = document.createElement("video");
    const playbackMimeType: string =
      sourceDescriptor.mimeType ?? "application/x-mpegURL";
    const canUseNativeHlsPlayback: boolean =
      videoElement.canPlayType(playbackMimeType) !== "";

    if (canUseNativeHlsPlayback) {
      return committedPlaybackDecision;
    }

    if (!committedPlaybackDecision.fallbackOrder.includes("shaka")) {
      return committedPlaybackDecision;
    }

    return {
      ...committedPlaybackDecision,
      chosenLane: "shaka",
      reasons: committedPlaybackDecision.reasons.includes(
        "fallback-from-preferred-lane",
      )
        ? [...committedPlaybackDecision.reasons]
        : [
            ...committedPlaybackDecision.reasons,
            "fallback-from-preferred-lane",
          ],
      reasonDetails: [
        ...committedPlaybackDecision.reasonDetails,
        "Browser-native playback was unavailable for this source, so the web runtime fell back to Shaka.",
      ],
      usedPreferredLane: false,
      usedFallbackLane: true,
    };
  }

  /**
   * @brief Create the fixed preview pool used by the web runtime
   *
   * @returns Stable preview slot array
   */
  private createPreviewRuntimeSessions(): ManagedPreviewRuntimeSession[] {
    const previewRuntimeSessions: ManagedPreviewRuntimeSession[] = [];

    for (
      let previewSlotIndex: number = 0;
      previewSlotIndex < WebMediaRuntimeAdapter.PREVIEW_POOL_SIZE;
      previewSlotIndex += 1
    ) {
      previewRuntimeSessions.push({
        runtimeSessionHandle: {
          handleId: `preview-slot-${previewSlotIndex}`,
          runtimeId: this.runtimeId,
        },
        plannedSessionId: null,
        itemId: null,
        sourceId: null,
        state: "inactive",
        hostElement: null,
        videoElement: null,
        shakaPlayer: null,
      });
    }

    return previewRuntimeSessions;
  }

  /**
   * @brief Reuse or allocate one preview slot for the requested logical session
   *
   * @param command - Shared warm command
   * @param plannedSession - Preview session that should own the slot
   *
   * @returns Matched preview slot, or `null` when no slot is available
   */
  private resolvePreviewRuntimeSession(
    command: MediaExecutionCommand,
    plannedSession: NonNullable<MediaExecutionCommand["session"]>,
  ): ManagedPreviewRuntimeSession | null {
    const existingPreviewRuntimeSession: ManagedPreviewRuntimeSession | null =
      this.findPreviewRuntimeSession(plannedSession.sessionId, command);

    if (existingPreviewRuntimeSession !== null) {
      return existingPreviewRuntimeSession;
    }

    const reusablePreviewRuntimeSession:
      | ManagedPreviewRuntimeSession
      | undefined = this.previewRuntimeSessions.find(
      (previewRuntimeSession: ManagedPreviewRuntimeSession): boolean =>
        previewRuntimeSession.plannedSessionId === null ||
        previewRuntimeSession.state === "inactive" ||
        previewRuntimeSession.state === "disposed",
    );

    if (reusablePreviewRuntimeSession !== undefined) {
      return reusablePreviewRuntimeSession;
    }

    const plannedPreviewSessionIds: Set<string> = new Set<string>(
      command.plan.sessions
        .filter((planSession): boolean => planSession.role === "preview")
        .map((planSession): string => planSession.sessionId),
    );
    const stalePreviewRuntimeSession: ManagedPreviewRuntimeSession | undefined =
      this.previewRuntimeSessions.find(
        (previewRuntimeSession: ManagedPreviewRuntimeSession): boolean =>
          previewRuntimeSession.plannedSessionId !== null &&
          !plannedPreviewSessionIds.has(previewRuntimeSession.plannedSessionId),
      );

    if (stalePreviewRuntimeSession !== undefined) {
      return stalePreviewRuntimeSession;
    }

    const hiddenPreviewRuntimeSession:
      | ManagedPreviewRuntimeSession
      | undefined = this.previewRuntimeSessions.find(
      (previewRuntimeSession: ManagedPreviewRuntimeSession): boolean =>
        previewRuntimeSession.state !== "preview-active",
    );

    return hiddenPreviewRuntimeSession ?? null;
  }

  /**
   * @brief Resolve one preview slot by session ID or runtime handle
   *
   * @param sessionId - Planned preview session identifier
   * @param command - Shared command that may carry the runtime handle
   *
   * @returns Matching preview slot, or `null` when none exists
   */
  private findPreviewRuntimeSession(
    sessionId: string | null,
    command: MediaExecutionCommand,
  ): ManagedPreviewRuntimeSession | null {
    const runtimeHandleId: string | null =
      command.runtimeSessionHandle?.handleId ?? null;

    if (runtimeHandleId !== null) {
      const previewRuntimeSessionByHandle:
        | ManagedPreviewRuntimeSession
        | undefined = this.previewRuntimeSessions.find(
        (previewRuntimeSession: ManagedPreviewRuntimeSession): boolean =>
          previewRuntimeSession.runtimeSessionHandle.handleId ===
          runtimeHandleId,
      );

      if (previewRuntimeSessionByHandle !== undefined) {
        return previewRuntimeSessionByHandle;
      }
    }

    if (sessionId === null) {
      return null;
    }

    const previewRuntimeSessionBySessionId:
      | ManagedPreviewRuntimeSession
      | undefined = this.previewRuntimeSessions.find(
      (previewRuntimeSession: ManagedPreviewRuntimeSession): boolean =>
        previewRuntimeSession.plannedSessionId === sessionId,
    );

    return previewRuntimeSessionBySessionId ?? null;
  }

  /**
   * @brief Prepare one preview slot for a new logical owner
   *
   * @param previewRuntimeSession - Preview slot being reused
   * @param plannedSession - Preview session that should own the slot
   */
  private async preparePreviewSessionForReuse(
    previewRuntimeSession: ManagedPreviewRuntimeSession,
    plannedSession: NonNullable<MediaExecutionCommand["session"]>,
  ): Promise<void> {
    if (
      previewRuntimeSession.plannedSessionId === plannedSession.sessionId &&
      previewRuntimeSession.sourceId === plannedSession.source?.sourceId
    ) {
      return;
    }

    await this.resetPreviewRuntimeSession(previewRuntimeSession);
    previewRuntimeSession.plannedSessionId = plannedSession.sessionId;
    previewRuntimeSession.itemId = plannedSession.itemId;
    previewRuntimeSession.sourceId = plannedSession.source?.sourceId ?? null;
    previewRuntimeSession.state = "warming-first-frame";
  }

  /**
   * @brief Reset one preview slot back to an unowned state
   *
   * @param previewRuntimeSession - Preview slot being cleared
   */
  private async resetPreviewRuntimeSession(
    previewRuntimeSession: ManagedPreviewRuntimeSession,
  ): Promise<void> {
    previewRuntimeSession.videoElement?.pause();
    this.detachPreviewSurface(previewRuntimeSession);
    await this.destroyPreviewShakaPlayer(previewRuntimeSession);

    if (previewRuntimeSession.videoElement !== null) {
      this.clearVideoElementSource(previewRuntimeSession.videoElement);
    }

    previewRuntimeSession.plannedSessionId = null;
    previewRuntimeSession.itemId = null;
    previewRuntimeSession.sourceId = null;
    previewRuntimeSession.state = "inactive";
  }

  /**
   * @brief Load the preview source and wait until the first frame is ready
   *
   * @param previewRuntimeSession - Preview slot receiving the source
   * @param plannedSession - Planned preview session carrying lane hints
   */
  private async loadPreviewSource(
    previewRuntimeSession: ManagedPreviewRuntimeSession,
    plannedSession: NonNullable<MediaExecutionCommand["session"]>,
  ): Promise<void> {
    const sourceDescriptor: MediaSourceDescriptor | null =
      plannedSession.source;
    const videoElement: HTMLVideoElement = this.ensurePreviewVideoElement(
      previewRuntimeSession,
    );
    const orderedLaneHints: MediaPlaybackLane[] = [
      plannedSession.desiredPlaybackLane,
      ...plannedSession.fallbackPlaybackLaneOrder,
    ].filter(
      (lane: MediaPlaybackLane | null): lane is MediaPlaybackLane =>
        lane !== null,
    );

    if (sourceDescriptor === null) {
      throw new Error("Web preview warm requires a source descriptor.");
    }

    const playbackMimeType: string =
      sourceDescriptor.mimeType ?? "application/x-mpegURL";
    const canUseNativeHlsPlayback: boolean =
      videoElement.canPlayType(playbackMimeType) !== "";
    const prefersShaka: boolean = orderedLaneHints[0] === "shaka";
    const readyForFirstFramePromise: Promise<void> =
      this.waitForLoadedData(videoElement);

    videoElement.poster = sourceDescriptor.posterUrl ?? "";

    if (canUseNativeHlsPlayback && !prefersShaka) {
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
      if (canUseNativeHlsPlayback) {
        videoElement.src = sourceDescriptor.url;
        videoElement.load();
        await readyForFirstFramePromise;
        return;
      }

      throw new Error("Shaka Player is not supported in this browser.");
    }

    const shakaPlayer: ShakaPlayer = new shaka.Player(videoElement);

    previewRuntimeSession.shakaPlayer = shakaPlayer;
    await shakaPlayer.load(sourceDescriptor.url);
    await readyForFirstFramePromise;
  }

  /**
   * @brief Keep active preview slots attached after browse rerenders
   */
  private syncActivePreviewSurfaces(): void {
    for (const previewRuntimeSession of this.previewRuntimeSessions) {
      if (previewRuntimeSession.state !== "preview-active") {
        continue;
      }

      this.attachPreviewSurface(
        previewRuntimeSession,
        previewRuntimeSession.itemId,
      );
    }
  }

  /**
   * @brief Pause every active preview other than the requested logical session
   *
   * @param sessionId - Preview session that should remain active
   */
  private deactivateOtherActivePreviewSessions(sessionId: string): void {
    for (const previewRuntimeSession of this.previewRuntimeSessions) {
      if (
        previewRuntimeSession.plannedSessionId === sessionId ||
        previewRuntimeSession.state !== "preview-active"
      ) {
        continue;
      }

      previewRuntimeSession.videoElement?.pause();
      this.detachPreviewSurface(previewRuntimeSession);
      previewRuntimeSession.state = "ready-first-frame";
    }
  }

  /**
   * @brief Attach one preview slot to the current browse card host
   *
   * @param previewRuntimeSession - Preview slot being shown
   * @param itemId - Focused item that should host the preview video
   */
  private attachPreviewSurface(
    previewRuntimeSession: ManagedPreviewRuntimeSession,
    itemId: string | null,
  ): void {
    const videoElement: HTMLVideoElement | null =
      previewRuntimeSession.videoElement;
    const surfaceEntry: WebPreviewSurfaceEntry | null =
      this.previewSurfaceRegistry.getEntry(itemId);

    if (videoElement === null || surfaceEntry === null) {
      this.detachPreviewSurface(previewRuntimeSession);
      return;
    }

    if (previewRuntimeSession.hostElement === surfaceEntry.hostElement) {
      surfaceEntry.hostElement.classList.add("is-active");
      this.updatePreviewCardDebugState(surfaceEntry.hostElement);
      return;
    }

    this.detachPreviewSurface(previewRuntimeSession);
    surfaceEntry.hostElement.replaceChildren(videoElement);
    surfaceEntry.hostElement.classList.add("is-active");
    previewRuntimeSession.hostElement = surfaceEntry.hostElement;
    this.updatePreviewCardDebugState(surfaceEntry.hostElement);
  }

  /**
   * @brief Remove one preview slot from its current browse card host
   *
   * @param previewRuntimeSession - Preview slot being detached
   */
  private detachPreviewSurface(
    previewRuntimeSession: ManagedPreviewRuntimeSession,
  ): void {
    const hostElement: HTMLDivElement | null =
      previewRuntimeSession.hostElement;
    const videoElement: HTMLVideoElement | null =
      previewRuntimeSession.videoElement;

    if (hostElement !== null) {
      hostElement.classList.remove("is-active");
      this.updatePreviewCardDebugState(hostElement);

      if (videoElement !== null && videoElement.parentElement === hostElement) {
        hostElement.replaceChildren();
      }
    }

    previewRuntimeSession.hostElement = null;
  }

  /**
   * @brief Keep the host card's debug data aligned with preview attachment state
   *
   * @param hostElement - Preview host that just changed active state
   */
  private updatePreviewCardDebugState(hostElement: HTMLDivElement): void {
    const thumbnailCardElement: HTMLElement | null = hostElement.closest(
      ".browse-thumbnail-card",
    );
    const artworkElement: HTMLElement | null = hostElement.closest(
      ".browse-thumbnail-artwork",
    );
    const hasStill: boolean =
      artworkElement?.classList.contains("has-still") === true;

    if (thumbnailCardElement === null) {
      return;
    }

    thumbnailCardElement.dataset.thumbnailVisualState =
      hostElement.classList.contains("is-active")
        ? "preview"
        : hasStill
          ? "still"
          : "fallback";
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
   * @brief Ensure one preview slot owns a reusable video element
   *
   * @param previewRuntimeSession - Preview slot that needs a video element
   *
   * @returns Preview video element used by the slot
   */
  private ensurePreviewVideoElement(
    previewRuntimeSession: ManagedPreviewRuntimeSession,
  ): HTMLVideoElement {
    if (previewRuntimeSession.videoElement !== null) {
      return previewRuntimeSession.videoElement;
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

    previewRuntimeSession.videoElement = videoElement;

    return videoElement;
  }

  /**
   * @brief Destroy any active Shaka player owned by one preview slot
   *
   * @param previewRuntimeSession - Preview slot whose player should be destroyed
   */
  private async destroyPreviewShakaPlayer(
    previewRuntimeSession: ManagedPreviewRuntimeSession,
  ): Promise<void> {
    if (previewRuntimeSession.shakaPlayer === null) {
      return;
    }

    const shakaPlayer: ShakaPlayer = previewRuntimeSession.shakaPlayer;

    previewRuntimeSession.shakaPlayer = null;
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
    committedPlaybackDecision: CommittedPlaybackDecision | null,
    failureReason: string | null,
    startupDebugState: MediaStartupDebugState | null = null,
  ): MediaExecutionResult {
    return {
      state,
      runtimeSessionHandle,
      committedPlaybackDecision:
        committedPlaybackDecision === null
          ? null
          : {
              ...committedPlaybackDecision,
              fallbackOrder: [...committedPlaybackDecision.fallbackOrder],
              reasons: [...committedPlaybackDecision.reasons],
              reasonDetails: [...committedPlaybackDecision.reasonDetails],
            },
      failureReason,
      startupDebugState:
        startupDebugState === null
          ? null
          : {
              phase: startupDebugState.phase,
              sourceId: startupDebugState.sourceId,
              warmResult:
                startupDebugState.warmResult === null
                  ? null
                  : {
                      manifest: startupDebugState.warmResult.manifest,
                      initSegment: startupDebugState.warmResult.initSegment,
                      startupWindow: startupDebugState.warmResult.startupWindow,
                      hotRange: startupDebugState.warmResult.hotRange,
                      notes: [...startupDebugState.warmResult.notes],
                    },
              directRuntimeFallbackReason:
                startupDebugState.directRuntimeFallbackReason,
            },
    };
  }

  /**
   * @brief Warm high-value startup artifacts through VFS for one runtime path
   *
   * @param phase - Runtime phase that is consulting VFS
   * @param sourceDescriptor - Source descriptor that owns the startup bytes
   * @param directRuntimeFallbackReason - Optional fallback note for debug output
   *
   * @returns Shared startup debug state, or `null` when no source was available
   */
  private async buildStartupDebugState(
    phase: MediaStartupDebugState["phase"],
    sourceDescriptor: MediaSourceDescriptor | null,
    directRuntimeFallbackReason: string | null = null,
  ): Promise<MediaStartupDebugState | null> {
    if (sourceDescriptor === null) {
      return null;
    }

    try {
      const warmResult: StartupWarmResult =
        await this.vfsController.warmStartupArtifacts({
          source: sourceDescriptor,
          variantKey: null,
          useCase:
            phase === "preview-warm"
              ? "preview-warm"
              : "committed-playback-startup",
          cachePolicy: this.vfsController.getDefaultCachePolicy(),
          allowServiceWorkerLookup: true,
          startupWindowByteLength: 131072,
          hotRangeByteLength: 262144,
        });

      return {
        phase,
        sourceId: sourceDescriptor.sourceId,
        warmResult,
        directRuntimeFallbackReason,
      };
    } catch (error: unknown) {
      return {
        phase,
        sourceId: sourceDescriptor.sourceId,
        warmResult: null,
        directRuntimeFallbackReason: this.describeRuntimeError(
          error,
          directRuntimeFallbackReason ??
            "VFS startup warming fell back to the direct runtime path.",
        ),
      };
    }
  }
}
