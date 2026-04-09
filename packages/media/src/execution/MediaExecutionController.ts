/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaKernelController } from "../kernel/MediaKernelController";
import type { MediaKernelState } from "../kernel/MediaKernelState";
import type { MediaPlan } from "../planning/MediaPlan";
import type { MediaPlanSession } from "../planning/MediaPlanSession";
import type { MediaSessionDescriptor } from "../sessions/MediaSessionDescriptor";
import type { MediaSourceDescriptor } from "../sources/MediaSourceDescriptor";
import type { MediaExecutionCommand } from "./MediaExecutionCommand";
import type { MediaExecutionCommandType } from "./MediaExecutionCommandType";
import type { MediaExecutionResult } from "./MediaExecutionResult";
import type { MediaExecutionSnapshot } from "./MediaExecutionSnapshot";
import type { MediaExecutionState } from "./MediaExecutionState";
import type { MediaRuntimeAdapter } from "./MediaRuntimeAdapter";
import type { MediaRuntimeCapabilities } from "./MediaRuntimeCapabilities";
import type { MediaRuntimeSessionHandle } from "./MediaRuntimeSessionHandle";

/**
 * @brief Listener signature used by the shared media execution controller
 */
export type MediaExecutionStateListener = (
  snapshots: MediaExecutionSnapshot[],
) => void;

/**
 * @brief Turn the shared media plan into simple runtime execution commands
 *
 * This controller intentionally stays conservative. It diffs the current plan,
 * emits explicit commands, and tolerates no-op or unsupported runtimes without
 * taking ownership of any app-specific playback implementation.
 */
export class MediaExecutionController {
  private readonly executionSnapshotsBySessionId: Map<
    string,
    MediaExecutionSnapshot
  >;
  private readonly mediaKernelController: MediaKernelController;
  private readonly stateListeners: Set<MediaExecutionStateListener>;

  private currentPlan: MediaPlan;
  private currentPlanSignature: string;
  private readonly removeMediaKernelSubscription: () => void;
  private runtimeAdapter: MediaRuntimeAdapter | null;
  private syncPromise: Promise<void>;

  /**
   * @brief Create the first shared runtime execution coordinator
   *
   * @param mediaKernelController - Shared media kernel that owns the current plan
   * @param runtimeAdapter - Optional runtime adapter supplied by the app shell
   */
  public constructor(
    mediaKernelController: MediaKernelController,
    runtimeAdapter: MediaRuntimeAdapter | null = null,
  ) {
    this.executionSnapshotsBySessionId = new Map<
      string,
      MediaExecutionSnapshot
    >();
    this.mediaKernelController = mediaKernelController;
    this.stateListeners = new Set<MediaExecutionStateListener>();
    this.currentPlan = this.mediaKernelController.getPlan();
    this.currentPlanSignature = this.createPlanSignature(this.currentPlan);
    this.runtimeAdapter = runtimeAdapter;
    this.syncPromise = Promise.resolve();
    this.removeMediaKernelSubscription = this.mediaKernelController.subscribe(
      (mediaKernelState: MediaKernelState): void => {
        const nextPlan: MediaPlan = mediaKernelState.plan;
        const nextPlanSignature: string = this.createPlanSignature(nextPlan);

        this.currentPlan = nextPlan;
        if (nextPlanSignature === this.currentPlanSignature) {
          return;
        }

        this.currentPlanSignature = nextPlanSignature;
        this.queueSync();
      },
    );

    if (this.runtimeAdapter !== null) {
      this.queueSync();
    }
  }

  /**
   * @brief Return the currently registered runtime adapter
   *
   * @returns Current runtime adapter, or `null` when none is registered
   */
  public getRuntimeAdapter(): MediaRuntimeAdapter | null {
    return this.runtimeAdapter;
  }

  /**
   * @brief Return current runtime execution capabilities
   *
   * @returns Runtime capability snapshot, or `null` when no adapter is present
   */
  public getRuntimeCapabilities(): MediaRuntimeCapabilities | null {
    return this.runtimeAdapter?.getCapabilities() ?? null;
  }

  /**
   * @brief Return the current read-only execution snapshots
   *
   * @returns Execution snapshots sorted by session identifier
   */
  public getState(): MediaExecutionSnapshot[] {
    return [...this.executionSnapshotsBySessionId.values()]
      .sort(
        (
          leftExecutionSnapshot: MediaExecutionSnapshot,
          rightExecutionSnapshot: MediaExecutionSnapshot,
        ): number =>
          leftExecutionSnapshot.sessionId.localeCompare(
            rightExecutionSnapshot.sessionId,
          ),
      )
      .map(
        (executionSnapshot: MediaExecutionSnapshot): MediaExecutionSnapshot =>
          this.cloneExecutionSnapshot(executionSnapshot),
      );
  }

  /**
   * @brief Subscribe to execution snapshot changes
   *
   * @param listener - Callback notified whenever execution state changes
   *
   * @returns Cleanup callback that removes the listener
   */
  public subscribe(listener: MediaExecutionStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());

    return (): void => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * @brief Register or replace the runtime adapter used for execution
   *
   * @param runtimeAdapter - Runtime adapter implemented by the current app shell
   */
  public setRuntimeAdapter(runtimeAdapter: MediaRuntimeAdapter | null): void {
    if (this.runtimeAdapter === runtimeAdapter) {
      return;
    }

    this.runtimeAdapter = runtimeAdapter;
    this.queueSync();
  }

  /**
   * @brief Release subscriptions owned by the execution controller
   */
  public destroy(): void {
    this.removeMediaKernelSubscription();
    this.stateListeners.clear();
  }

  /**
   * @brief Serialize plan reconciliation work to keep commands predictable
   */
  private queueSync(): void {
    this.syncPromise = this.syncPromise.then(
      async (): Promise<void> => {
        await this.syncExecutionPlan();
      },
      async (): Promise<void> => {
        await this.syncExecutionPlan();
      },
    );
  }

  /**
   * @brief Diff the latest plan against current execution snapshots
   */
  private async syncExecutionPlan(): Promise<void> {
    const runtimeAdapter: MediaRuntimeAdapter | null = this.runtimeAdapter;

    if (runtimeAdapter === null) {
      return;
    }

    const currentPlan: MediaPlan = this.currentPlan;
    const plannedSessionIds: Set<string> = new Set<string>(
      currentPlan.sessions.map(
        (plannedSession: MediaPlanSession): string => plannedSession.sessionId,
      ),
    );

    await this.executeGlobalCommand("sync-plan", runtimeAdapter, currentPlan);

    for (const plannedSession of currentPlan.sessions) {
      this.ensureKernelSession(plannedSession);
      this.upsertExecutionSnapshot(
        this.createExecutionSnapshot(
          plannedSession.sessionId,
          plannedSession,
          this.executionSnapshotsBySessionId.get(plannedSession.sessionId)
            ?.runtimeSessionHandle ?? null,
          this.executionSnapshotsBySessionId.get(plannedSession.sessionId)
            ?.state ?? "inactive",
          this.executionSnapshotsBySessionId.get(plannedSession.sessionId)
            ?.lastCommandType ?? null,
          this.executionSnapshotsBySessionId.get(plannedSession.sessionId)
            ?.failureReason ?? null,
        ),
      );

      if (this.shouldWarmSession(plannedSession)) {
        await this.executeSessionCommand(
          "warm-session",
          plannedSession,
          runtimeAdapter,
        );
      }

      if (this.shouldActivateSession(plannedSession)) {
        await this.executeSessionCommand(
          "activate-session",
          plannedSession,
          runtimeAdapter,
        );
      }
    }

    for (const sessionId of [...this.executionSnapshotsBySessionId.keys()]) {
      if (plannedSessionIds.has(sessionId)) {
        continue;
      }

      await this.executeObsoleteSessionCommands(sessionId, runtimeAdapter);
    }
  }

  /**
   * @brief Notify runtime adapters that a full plan sync occurred
   *
   * @param commandType - Command type being sent
   * @param runtimeAdapter - Runtime adapter that should receive the command
   * @param mediaPlan - Current deterministic media plan
   */
  private async executeGlobalCommand(
    commandType: MediaExecutionCommandType,
    runtimeAdapter: MediaRuntimeAdapter,
    mediaPlan: MediaPlan,
  ): Promise<void> {
    const command: MediaExecutionCommand = {
      type: commandType,
      plan: mediaPlan,
      session: null,
      snapshot: null,
      runtimeSessionHandle: null,
    };

    try {
      await runtimeAdapter.execute(command);
    } catch (error: unknown) {
      console.warn(
        "Media runtime adapter rejected a plan sync command.",
        error,
      );
    }
  }

  /**
   * @brief Determine whether a planned session still needs warming work
   *
   * @param plannedSession - Planned session being considered
   *
   * @returns `true` when a warm command should be issued
   */
  private shouldWarmSession(plannedSession: MediaPlanSession): boolean {
    if (
      plannedSession.role !== "preview" ||
      plannedSession.desiredWarmth === "cold"
    ) {
      return false;
    }

    const executionSnapshot: MediaExecutionSnapshot | undefined =
      this.executionSnapshotsBySessionId.get(plannedSession.sessionId);

    if (executionSnapshot === undefined) {
      return true;
    }

    return !(
      executionSnapshot.state === "warming-metadata" ||
      executionSnapshot.state === "warming-first-frame" ||
      executionSnapshot.state === "ready-first-frame" ||
      executionSnapshot.state === "preview-active"
    );
  }

  /**
   * @brief Determine whether a background session should be activated
   *
   * @param plannedSession - Planned session being considered
   *
   * @returns `true` when an activate command should be issued
   */
  private shouldActivateSession(plannedSession: MediaPlanSession): boolean {
    const executionSnapshot: MediaExecutionSnapshot | undefined =
      this.executionSnapshotsBySessionId.get(plannedSession.sessionId);

    if (
      plannedSession.role === "preview" &&
      plannedSession.desiredWarmth === "preloaded"
    ) {
      return executionSnapshot?.state !== "preview-active";
    }

    if (
      plannedSession.role === "background" &&
      plannedSession.desiredWarmth === "active"
    ) {
      return executionSnapshot?.state !== "background-active";
    }

    return false;
  }

  /**
   * @brief Execute cleanup commands for a session that is no longer planned
   *
   * @param sessionId - Obsolete session identifier
   * @param runtimeAdapter - Runtime adapter that owns execution
   */
  private async executeObsoleteSessionCommands(
    sessionId: string,
    runtimeAdapter: MediaRuntimeAdapter,
  ): Promise<void> {
    const executionSnapshot: MediaExecutionSnapshot | undefined =
      this.executionSnapshotsBySessionId.get(sessionId);

    if (executionSnapshot === undefined) {
      return;
    }

    await this.executeExistingSessionCommand(
      "deactivate-session",
      executionSnapshot,
      runtimeAdapter,
    );
    await this.executeExistingSessionCommand(
      "dispose-session",
      executionSnapshot,
      runtimeAdapter,
    );
    this.executionSnapshotsBySessionId.delete(sessionId);
    this.mediaKernelController.removeSession(sessionId);
    this.notifyStateListeners();
  }

  /**
   * @brief Execute one command for a currently planned session
   *
   * @param commandType - Command type being sent
   * @param plannedSession - Planned session that owns the command
   * @param runtimeAdapter - Runtime adapter that should execute the command
   */
  private async executeSessionCommand(
    commandType: MediaExecutionCommandType,
    plannedSession: MediaPlanSession,
    runtimeAdapter: MediaRuntimeAdapter,
  ): Promise<void> {
    const currentSnapshot: MediaExecutionSnapshot =
      this.executionSnapshotsBySessionId.get(plannedSession.sessionId) ??
      this.createExecutionSnapshot(
        plannedSession.sessionId,
        plannedSession,
        null,
        "inactive",
        null,
        null,
      );
    const runtimeCapabilities: MediaRuntimeCapabilities =
      runtimeAdapter.getCapabilities();

    if (
      !this.isCommandSupported(commandType, plannedSession, runtimeCapabilities)
    ) {
      this.upsertExecutionSnapshot({
        ...currentSnapshot,
        planSession: this.clonePlanSession(plannedSession),
        state: "unsupported",
        lastCommandType: commandType,
        failureReason: this.createUnsupportedReason(
          commandType,
          plannedSession,
          runtimeCapabilities,
        ),
      });

      return;
    }

    const nextTransientState: MediaExecutionState | null =
      this.createTransientExecutionState(commandType, plannedSession);

    this.upsertExecutionSnapshot({
      ...currentSnapshot,
      planSession: this.clonePlanSession(plannedSession),
      state: nextTransientState ?? currentSnapshot.state,
      lastCommandType: commandType,
      failureReason: null,
    });

    const command: MediaExecutionCommand = {
      type: commandType,
      plan: this.currentPlan,
      session: this.clonePlanSession(plannedSession),
      snapshot: this.cloneExecutionSnapshot(currentSnapshot),
      runtimeSessionHandle: currentSnapshot.runtimeSessionHandle,
    };
    const commandResult: MediaExecutionResult =
      await this.executeRuntimeCommand(runtimeAdapter, command, plannedSession);

    this.applyExecutionResult(commandType, plannedSession, commandResult);
  }

  /**
   * @brief Execute one cleanup command for an already-known session
   *
   * @param commandType - Command type being sent
   * @param executionSnapshot - Existing execution snapshot
   * @param runtimeAdapter - Runtime adapter that should execute the command
   */
  private async executeExistingSessionCommand(
    commandType: MediaExecutionCommandType,
    executionSnapshot: MediaExecutionSnapshot,
    runtimeAdapter: MediaRuntimeAdapter,
  ): Promise<void> {
    const command: MediaExecutionCommand = {
      type: commandType,
      plan: this.currentPlan,
      session: this.clonePlanSession(executionSnapshot.planSession),
      snapshot: this.cloneExecutionSnapshot(executionSnapshot),
      runtimeSessionHandle: executionSnapshot.runtimeSessionHandle,
    };

    try {
      await runtimeAdapter.execute(command);
    } catch (error: unknown) {
      console.warn("Media runtime adapter rejected a cleanup command.", error);
    }
  }

  /**
   * @brief Execute one runtime command with shared error handling
   *
   * @param runtimeAdapter - Runtime adapter that should execute the command
   * @param command - Shared command to execute
   * @param plannedSession - Planned session associated with the command
   *
   * @returns Runtime result converted into the shared execution contract
   */
  private async executeRuntimeCommand(
    runtimeAdapter: MediaRuntimeAdapter,
    command: MediaExecutionCommand,
    plannedSession: MediaPlanSession,
  ): Promise<MediaExecutionResult> {
    try {
      return await runtimeAdapter.execute(command);
    } catch (error: unknown) {
      const failureReason: string =
        error instanceof Error
          ? error.message
          : "Unknown runtime adapter error";

      return {
        state: "failed",
        runtimeSessionHandle: command.runtimeSessionHandle,
        failureReason: `${plannedSession.sessionId}: ${failureReason}`,
      };
    }
  }

  /**
   * @brief Apply a runtime result to shared execution and kernel state
   *
   * @param commandType - Command that produced the result
   * @param plannedSession - Planned session associated with the result
   * @param commandResult - Result returned by the runtime adapter
   */
  private applyExecutionResult(
    commandType: MediaExecutionCommandType,
    plannedSession: MediaPlanSession,
    commandResult: MediaExecutionResult,
  ): void {
    const nextExecutionSnapshot: MediaExecutionSnapshot =
      this.createExecutionSnapshot(
        plannedSession.sessionId,
        plannedSession,
        commandResult.runtimeSessionHandle,
        commandResult.state,
        commandType,
        commandResult.failureReason,
      );

    this.upsertExecutionSnapshot(nextExecutionSnapshot);

    if (commandType === "dispose-session") {
      this.mediaKernelController.removeSession(plannedSession.sessionId);
      return;
    }

    this.syncKernelSessionState(nextExecutionSnapshot);
  }

  /**
   * @brief Keep the older kernel session snapshot roughly aligned with execution
   *
   * @param executionSnapshot - Latest execution snapshot for one session
   */
  private syncKernelSessionState(
    executionSnapshot: MediaExecutionSnapshot,
  ): void {
    switch (executionSnapshot.state) {
      case "warming-metadata":
        this.mediaKernelController.markSessionWarmth(
          executionSnapshot.sessionId,
          "metadata",
        );
        this.mediaKernelController.setSessionState(
          executionSnapshot.sessionId,
          "loading",
        );
        return;
      case "warming-first-frame":
        this.mediaKernelController.markSessionWarmth(
          executionSnapshot.sessionId,
          "first-frame",
        );
        this.mediaKernelController.setSessionState(
          executionSnapshot.sessionId,
          "loading",
        );
        return;
      case "ready-first-frame":
        this.mediaKernelController.markSessionWarmth(
          executionSnapshot.sessionId,
          "first-frame",
        );
        this.mediaKernelController.setSessionState(
          executionSnapshot.sessionId,
          "first-frame-ready",
        );
        return;
      case "preview-active":
        this.mediaKernelController.markSessionWarmth(
          executionSnapshot.sessionId,
          "active",
        );
        this.mediaKernelController.setSessionState(
          executionSnapshot.sessionId,
          "previewing",
        );
        return;
      case "background-active":
        this.mediaKernelController.markSessionWarmth(
          executionSnapshot.sessionId,
          "active",
        );
        this.mediaKernelController.setSessionState(
          executionSnapshot.sessionId,
          "playing",
        );
        return;
      case "failed":
        this.mediaKernelController.setSessionState(
          executionSnapshot.sessionId,
          "failed",
          executionSnapshot.failureReason,
        );
        return;
      case "disposed":
      case "inactive":
      case "unsupported":
        this.mediaKernelController.markSessionWarmth(
          executionSnapshot.sessionId,
          "cold",
        );
        this.mediaKernelController.setSessionState(
          executionSnapshot.sessionId,
          "idle",
        );
    }
  }

  /**
   * @brief Ensure the older kernel session model has a matching logical session
   *
   * @param plannedSession - Planned session that should exist in the kernel
   */
  private ensureKernelSession(plannedSession: MediaPlanSession): void {
    const descriptor: MediaSessionDescriptor = {
      sessionId: plannedSession.sessionId,
      role: plannedSession.role,
      itemId: plannedSession.itemId,
      source: this.cloneSourceDescriptor(plannedSession.source),
      playbackLane: plannedSession.desiredPlaybackLane,
      rendererKind: plannedSession.desiredRendererKind,
    };

    this.mediaKernelController.registerSession(descriptor);
  }

  /**
   * @brief Determine whether the runtime says a command is currently supported
   *
   * @param commandType - Command under consideration
   * @param plannedSession - Planned session that owns the command
   * @param runtimeCapabilities - Runtime capability snapshot
   *
   * @returns `true` when the command should be attempted
   */
  private isCommandSupported(
    commandType: MediaExecutionCommandType,
    plannedSession: MediaPlanSession,
    runtimeCapabilities: MediaRuntimeCapabilities,
  ): boolean {
    switch (commandType) {
      case "warm-session":
        if (plannedSession.role !== "preview") {
          return false;
        }

        if (
          plannedSession.role === "preview" &&
          plannedSession.visibility !== "visible" &&
          !runtimeCapabilities.canKeepHiddenWarmSession
        ) {
          return false;
        }

        return runtimeCapabilities.canWarmFirstFrame;
      case "activate-session":
        if (plannedSession.role === "preview") {
          return runtimeCapabilities.canPreviewInline;
        }

        return runtimeCapabilities.canActivateBackground;
      case "deactivate-session":
      case "dispose-session":
      case "sync-plan":
        return true;
    }
  }

  /**
   * @brief Describe why a command was marked unsupported
   *
   * @param commandType - Command that was skipped
   * @param plannedSession - Planned session associated with the command
   * @param runtimeCapabilities - Runtime capability snapshot
   *
   * @returns Human-readable unsupported reason
   */
  private createUnsupportedReason(
    commandType: MediaExecutionCommandType,
    plannedSession: MediaPlanSession,
    runtimeCapabilities: MediaRuntimeCapabilities,
  ): string {
    if (
      commandType === "warm-session" &&
      plannedSession.role === "preview" &&
      plannedSession.visibility !== "visible" &&
      !runtimeCapabilities.canKeepHiddenWarmSession
    ) {
      return "Runtime adapter cannot keep hidden preview sessions warm.";
    }

    if (commandType === "warm-session") {
      if (plannedSession.role !== "preview") {
        return "Runtime adapter does not warm background sessions in this phase.";
      }

      return "Runtime adapter cannot warm a first frame for this session.";
    }

    if (commandType === "activate-session") {
      return plannedSession.role === "preview"
        ? "Runtime adapter cannot activate an inline preview session."
        : "Runtime adapter cannot activate a background session.";
    }

    return "Runtime adapter does not support this execution command.";
  }

  /**
   * @brief Store one execution snapshot and notify listeners
   *
   * @param executionSnapshot - Snapshot that should become current
   */
  private upsertExecutionSnapshot(
    executionSnapshot: MediaExecutionSnapshot,
  ): void {
    this.executionSnapshotsBySessionId.set(
      executionSnapshot.sessionId,
      this.cloneExecutionSnapshot(executionSnapshot),
    );
    this.notifyStateListeners();
  }

  /**
   * @brief Notify every listener about the latest execution state
   */
  private notifyStateListeners(): void {
    const executionState: MediaExecutionSnapshot[] = this.getState();

    for (const stateListener of this.stateListeners) {
      stateListener(executionState);
    }
  }

  /**
   * @brief Create one shared execution snapshot
   *
   * @param sessionId - Stable logical session identifier
   * @param plannedSession - Planned session associated with the snapshot
   * @param runtimeSessionHandle - Runtime-owned session handle
   * @param state - Execution state recorded for the session
   * @param lastCommandType - Most recent command issued for the session
   * @param failureReason - Optional failure or unsupported detail
   *
   * @returns New execution snapshot
   */
  private createExecutionSnapshot(
    sessionId: string,
    plannedSession: MediaPlanSession | null,
    runtimeSessionHandle: MediaRuntimeSessionHandle | null,
    state: MediaExecutionState,
    lastCommandType: MediaExecutionCommandType | null,
    failureReason: string | null,
  ): MediaExecutionSnapshot {
    return {
      sessionId,
      planSession: this.clonePlanSession(plannedSession),
      state,
      runtimeSessionHandle:
        this.cloneRuntimeSessionHandle(runtimeSessionHandle),
      lastCommandType,
      failureReason,
    };
  }

  /**
   * @brief Report the in-flight state associated with one execution command
   *
   * @param commandType - Command about to be issued
   * @param plannedSession - Planned session receiving the command
   *
   * @returns Transient execution state, or `null` when no change is needed
   */
  private createTransientExecutionState(
    commandType: MediaExecutionCommandType,
    plannedSession: MediaPlanSession,
  ): MediaExecutionState | null {
    if (commandType === "warm-session") {
      return plannedSession.desiredWarmth === "metadata"
        ? "warming-metadata"
        : "warming-first-frame";
    }

    return null;
  }

  /**
   * @brief Clone a read-only execution snapshot
   *
   * @param executionSnapshot - Snapshot to clone
   *
   * @returns Cloned execution snapshot
   */
  private cloneExecutionSnapshot(
    executionSnapshot: MediaExecutionSnapshot,
  ): MediaExecutionSnapshot {
    return {
      sessionId: executionSnapshot.sessionId,
      planSession: this.clonePlanSession(executionSnapshot.planSession),
      state: executionSnapshot.state,
      runtimeSessionHandle: this.cloneRuntimeSessionHandle(
        executionSnapshot.runtimeSessionHandle,
      ),
      lastCommandType: executionSnapshot.lastCommandType,
      failureReason: executionSnapshot.failureReason,
    };
  }

  /**
   * @brief Clone one runtime-owned session handle
   *
   * @param runtimeSessionHandle - Runtime-owned handle to clone
   *
   * @returns Cloned runtime handle, or `null` when absent
   */
  private cloneRuntimeSessionHandle(
    runtimeSessionHandle: MediaRuntimeSessionHandle | null,
  ): MediaRuntimeSessionHandle | null {
    if (runtimeSessionHandle === null) {
      return null;
    }

    return {
      handleId: runtimeSessionHandle.handleId,
      runtimeId: runtimeSessionHandle.runtimeId,
    };
  }

  /**
   * @brief Clone one planned session entry
   *
   * @param plannedSession - Planned session to clone
   *
   * @returns Cloned planned session, or `null` when absent
   */
  private clonePlanSession(
    plannedSession: MediaPlanSession | null,
  ): MediaPlanSession | null {
    if (plannedSession === null) {
      return null;
    }

    return {
      sessionId: plannedSession.sessionId,
      itemId: plannedSession.itemId,
      source: this.cloneSourceDescriptor(plannedSession.source),
      role: plannedSession.role,
      desiredPlaybackLane: plannedSession.desiredPlaybackLane,
      desiredRendererKind: plannedSession.desiredRendererKind,
      desiredWarmth: plannedSession.desiredWarmth,
      priority: plannedSession.priority,
      visibility: plannedSession.visibility,
      reason: {
        intentType: plannedSession.reason.intentType,
        kind: plannedSession.reason.kind,
        message: plannedSession.reason.message,
      },
    };
  }

  /**
   * @brief Clone one media source descriptor
   *
   * @param sourceDescriptor - Source descriptor to clone
   *
   * @returns Cloned source descriptor, or `null` when absent
   */
  private cloneSourceDescriptor(
    sourceDescriptor: MediaSourceDescriptor | null,
  ): MediaSourceDescriptor | null {
    if (sourceDescriptor === null) {
      return null;
    }

    return {
      sourceId: sourceDescriptor.sourceId,
      kind: sourceDescriptor.kind,
      url: sourceDescriptor.url,
      mimeType: sourceDescriptor.mimeType,
      posterUrl: sourceDescriptor.posterUrl,
    };
  }

  /**
   * @brief Create a stable signature for plan-diff detection
   *
   * @param mediaPlan - Current shared media plan
   *
   * @returns Deterministic signature string
   */
  private createPlanSignature(mediaPlan: MediaPlan): string {
    return mediaPlan.sessions
      .map((plannedSession: MediaPlanSession): string =>
        [
          plannedSession.sessionId,
          plannedSession.itemId ?? "null",
          plannedSession.source?.sourceId ?? "null",
          plannedSession.role,
          plannedSession.desiredPlaybackLane ?? "null",
          plannedSession.desiredRendererKind,
          plannedSession.desiredWarmth,
          plannedSession.priority,
          plannedSession.visibility,
          plannedSession.reason.intentType,
          plannedSession.reason.kind,
        ].join("|"),
      )
      .join("||");
  }
}
