/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { VfsController } from "@meditation-surf/vfs";

import type { AudioExecutionSnapshot } from "../audio/AudioExecutionSnapshot";
import { AudioPolicy } from "../audio/AudioPolicy";
import type { AudioPolicyDecision } from "../audio/AudioPolicyDecision";
import type { MediaCapabilityProfile } from "../capabilities/MediaCapabilityProfile";
import { CommittedPlaybackChooser } from "../committed/CommittedPlaybackChooser";
import type { CommittedPlaybackDecision } from "../committed/CommittedPlaybackDecision";
import type { CommittedPlaybackIntent } from "../committed/CommittedPlaybackIntent";
import type { CommittedPlaybackLifecycleState } from "../committed/CommittedPlaybackLifecycleState";
import type { CommittedPlaybackSnapshot } from "../committed/CommittedPlaybackSnapshot";
import type { MediaKernelController } from "../kernel/MediaKernelController";
import type { MediaKernelState } from "../kernel/MediaKernelState";
import type { MediaPlan } from "../planning/MediaPlan";
import type { MediaPlanSession } from "../planning/MediaPlanSession";
import type { PreviewSessionAssignment } from "../preview/PreviewSessionAssignment";
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
import type { MediaStartupDebugState } from "./MediaStartupDebugState";

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
  private readonly vfsController: VfsController;

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
   * @param vfsController - Shared VFS controller that owns startup-byte storage
   */
  public constructor(
    mediaKernelController: MediaKernelController,
    runtimeAdapter: MediaRuntimeAdapter | null = null,
    vfsController: VfsController = new VfsController(),
  ) {
    this.executionSnapshotsBySessionId = new Map<
      string,
      MediaExecutionSnapshot
    >();
    this.mediaKernelController = mediaKernelController;
    this.stateListeners = new Set<MediaExecutionStateListener>();
    this.vfsController = vfsController;
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
   * @brief Return the shared VFS controller used for startup acceleration
   *
   * @returns Shared VFS controller
   */
  public getVfsController(): VfsController {
    return this.vfsController;
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
    const currentMediaKernelState: MediaKernelState =
      this.mediaKernelController.getState();
    const runtimeCapabilities: MediaRuntimeCapabilities =
      runtimeAdapter.getCapabilities();
    const plannedSessionIds: Set<string> = new Set<string>(
      currentPlan.sessions.map(
        (plannedSession: MediaPlanSession): string => plannedSession.sessionId,
      ),
    );

    await this.executeGlobalCommand("sync-plan", runtimeAdapter, currentPlan);

    for (const plannedSession of currentPlan.sessions) {
      const previousExecutionSnapshot: MediaExecutionSnapshot | undefined =
        this.executionSnapshotsBySessionId.get(plannedSession.sessionId);
      const committedPlaybackDecision: CommittedPlaybackDecision | null =
        this.resolveCommittedPlaybackDecision(
          plannedSession,
          runtimeAdapter.runtimeId,
          runtimeCapabilities,
          currentMediaKernelState,
          previousExecutionSnapshot,
        );
      const requestedAudioExecution: AudioExecutionSnapshot | null =
        this.resolveRequestedAudioExecution(
          plannedSession,
          runtimeCapabilities,
          committedPlaybackDecision,
        );
      const committedPlaybackSnapshot: CommittedPlaybackSnapshot | null =
        this.createCommittedPlaybackSnapshot(
          plannedSession,
          currentMediaKernelState,
          committedPlaybackDecision,
          committedPlaybackDecision !== null &&
            !this.areCommittedPlaybackDecisionsEqual(
              previousExecutionSnapshot?.committedPlayback?.decision ?? null,
              committedPlaybackDecision,
            )
            ? "selected"
            : this.resolveCommittedPlaybackLifecycleState(
                previousExecutionSnapshot?.state ?? "inactive",
                previousExecutionSnapshot?.committedPlayback?.lifecycleState ??
                  "selected",
              ),
        );
      this.ensureKernelSession(plannedSession, committedPlaybackDecision);

      this.upsertExecutionSnapshot(
        this.createExecutionSnapshot(
          plannedSession.sessionId,
          plannedSession,
          previousExecutionSnapshot?.runtimeSessionHandle ?? null,
          previousExecutionSnapshot?.state ?? "inactive",
          previousExecutionSnapshot?.previewSessionAssignment ?? null,
          committedPlaybackSnapshot,
          requestedAudioExecution,
          previousExecutionSnapshot?.startupDebugState ?? null,
          previousExecutionSnapshot?.lastCommandType ?? null,
          previousExecutionSnapshot?.failureReason ?? null,
        ),
      );
    }

    for (const sessionId of [...this.executionSnapshotsBySessionId.keys()]) {
      if (plannedSessionIds.has(sessionId)) {
        continue;
      }

      await this.executeObsoleteSessionCommands(sessionId, runtimeAdapter);
    }

    for (const plannedSession of currentPlan.sessions) {
      if (this.shouldDeactivateSession(plannedSession)) {
        await this.executeSessionCommand(
          "deactivate-session",
          plannedSession,
          runtimeAdapter,
        );
      }
    }

    for (const plannedSession of currentPlan.sessions) {
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
      committedPlaybackDecision: null,
      audioExecution: null,
      audioPolicyDecision: null,
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
   * @brief Determine whether one preview session should pause back to warm-hidden
   *
   * @param plannedSession - Planned session being considered
   *
   * @returns `true` when a deactivate command should be issued
   */
  private shouldDeactivateSession(plannedSession: MediaPlanSession): boolean {
    if (plannedSession.role !== "preview") {
      return false;
    }

    const executionSnapshot: MediaExecutionSnapshot | undefined =
      this.executionSnapshotsBySessionId.get(plannedSession.sessionId);

    return (
      plannedSession.desiredWarmth !== "preloaded" &&
      executionSnapshot?.state === "preview-active"
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
      if (
        executionSnapshot?.state === "activating-background" ||
        executionSnapshot?.state === "waiting-first-frame"
      ) {
        return false;
      }

      return (
        executionSnapshot?.state !== "background-active" ||
        executionSnapshot.committedPlayback?.lifecycleState === "selected"
      );
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
        null,
        null,
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
        startupDebugState: null,
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
      committedPlayback:
        plannedSession.role === "background"
          ? this.transitionCommittedPlaybackSnapshot(
              currentSnapshot.committedPlayback,
              "activating-background",
            )
          : currentSnapshot.committedPlayback,
      audioExecution: this.cloneAudioExecutionSnapshot(
        currentSnapshot.audioExecution,
      ),
      startupDebugState: currentSnapshot.startupDebugState,
      lastCommandType: commandType,
      failureReason: null,
    });

    const command: MediaExecutionCommand = {
      type: commandType,
      plan: this.currentPlan,
      session: this.clonePlanSession(plannedSession),
      snapshot: this.cloneExecutionSnapshot(currentSnapshot),
      runtimeSessionHandle: currentSnapshot.runtimeSessionHandle,
      committedPlaybackDecision:
        currentSnapshot.committedPlayback?.decision ?? null,
      audioExecution: this.cloneAudioExecutionSnapshot(
        currentSnapshot.audioExecution,
      ),
      audioPolicyDecision:
        currentSnapshot.audioExecution?.policyDecision ?? null,
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
      committedPlaybackDecision:
        executionSnapshot.committedPlayback?.decision ?? null,
      audioExecution: this.cloneAudioExecutionSnapshot(
        executionSnapshot.audioExecution,
      ),
      audioPolicyDecision:
        executionSnapshot.audioExecution?.policyDecision ?? null,
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
        committedPlaybackDecision: command.committedPlaybackDecision,
        audioExecution: command.audioExecution,
        failureReason: `${plannedSession.sessionId}: ${failureReason}`,
        startupDebugState: null,
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
    const currentExecutionSnapshot: MediaExecutionSnapshot | undefined =
      this.executionSnapshotsBySessionId.get(plannedSession.sessionId);
    const nextExecutionSnapshot: MediaExecutionSnapshot =
      this.createExecutionSnapshot(
        plannedSession.sessionId,
        plannedSession,
        commandResult.runtimeSessionHandle,
        commandResult.state,
        this.createPreviewSessionAssignment(
          plannedSession,
          commandResult.runtimeSessionHandle,
          commandResult.state,
        ),
        this.createCommittedPlaybackSnapshot(
          plannedSession,
          this.mediaKernelController.getState(),
          commandResult.committedPlaybackDecision ??
            currentExecutionSnapshot?.committedPlayback?.decision ??
            null,
          this.resolveCommittedPlaybackLifecycleState(
            commandResult.state,
            currentExecutionSnapshot?.committedPlayback?.lifecycleState ??
              "selected",
          ),
        ),
        commandResult.audioExecution ??
          currentExecutionSnapshot?.audioExecution ??
          null,
        commandResult.startupDebugState,
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
      case "activating-background":
      case "warming-first-frame":
      case "waiting-first-frame":
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
   * @param committedPlaybackDecision - Resolved committed playback decision, when one exists
   */
  private ensureKernelSession(
    plannedSession: MediaPlanSession,
    committedPlaybackDecision: CommittedPlaybackDecision | null = null,
  ): void {
    const descriptor: MediaSessionDescriptor = {
      sessionId: plannedSession.sessionId,
      role: plannedSession.role,
      itemId: plannedSession.itemId,
      source: this.cloneSourceDescriptor(plannedSession.source),
      playbackLane:
        plannedSession.role === "background"
          ? (committedPlaybackDecision?.chosenLane ??
            plannedSession.desiredPlaybackLane)
          : plannedSession.desiredPlaybackLane,
      rendererKind:
        plannedSession.role === "background"
          ? (committedPlaybackDecision?.preferredRendererKind ??
            plannedSession.desiredRendererKind)
          : plannedSession.desiredRendererKind,
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
   * @param startupDebugState - Optional VFS startup debug state for the session
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
    previewSessionAssignment: PreviewSessionAssignment | null,
    committedPlayback: CommittedPlaybackSnapshot | null,
    audioExecution: AudioExecutionSnapshot | null,
    startupDebugState: MediaStartupDebugState | null,
    lastCommandType: MediaExecutionCommandType | null,
    failureReason: string | null,
  ): MediaExecutionSnapshot {
    return {
      sessionId,
      planSession: this.clonePlanSession(plannedSession),
      state,
      runtimeSessionHandle:
        this.cloneRuntimeSessionHandle(runtimeSessionHandle),
      previewSessionAssignment: this.clonePreviewSessionAssignment(
        previewSessionAssignment,
      ),
      committedPlayback: this.cloneCommittedPlaybackSnapshot(committedPlayback),
      audioExecution: this.cloneAudioExecutionSnapshot(audioExecution),
      startupDebugState: this.cloneStartupDebugState(startupDebugState),
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

    if (
      commandType === "activate-session" &&
      plannedSession.role === "background"
    ) {
      return "activating-background";
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
      previewSessionAssignment: this.clonePreviewSessionAssignment(
        executionSnapshot.previewSessionAssignment,
      ),
      committedPlayback: this.cloneCommittedPlaybackSnapshot(
        executionSnapshot.committedPlayback,
      ),
      audioExecution: this.cloneAudioExecutionSnapshot(
        executionSnapshot.audioExecution,
      ),
      startupDebugState: this.cloneStartupDebugState(
        executionSnapshot.startupDebugState,
      ),
      lastCommandType: executionSnapshot.lastCommandType,
      failureReason: executionSnapshot.failureReason,
    };
  }

  /**
   * @brief Clone one requested-or-actual audio execution snapshot
   *
   * @param audioExecution - Audio execution snapshot to clone
   *
   * @returns Cloned audio execution snapshot, or `null` when absent
   */
  private cloneAudioExecutionSnapshot(
    audioExecution: AudioExecutionSnapshot | null,
  ): AudioExecutionSnapshot | null {
    if (audioExecution === null) {
      return null;
    }

    return {
      requestedAudioMode: audioExecution.requestedAudioMode,
      actualAudioMode: audioExecution.actualAudioMode,
      fallbackMode: audioExecution.fallbackMode,
      premiumAttemptRequested: audioExecution.premiumAttemptRequested,
      usedFallback: audioExecution.usedFallback,
      runtimeAcceptedRequestedMode: audioExecution.runtimeAcceptedRequestedMode,
      policyDecision: this.cloneAudioPolicyDecision(
        audioExecution.policyDecision,
      ),
      runtimeReason: audioExecution.runtimeReason,
    };
  }

  /**
   * @brief Clone one shared audio-policy decision
   *
   * @param audioPolicyDecision - Audio-policy decision to clone
   *
   * @returns Cloned audio-policy decision
   */
  private cloneAudioPolicyDecision(
    audioPolicyDecision: AudioPolicyDecision,
  ): AudioPolicyDecision {
    return {
      audioMode: audioPolicyDecision.audioMode,
      fallbackMode: audioPolicyDecision.fallbackMode,
      requestedPremiumAttempt: audioPolicyDecision.requestedPremiumAttempt,
      usedFallback: audioPolicyDecision.usedFallback,
      trackPolicy: {
        preferPremiumAudio: audioPolicyDecision.trackPolicy.preferPremiumAudio,
        preferDefaultTrack: audioPolicyDecision.trackPolicy.preferDefaultTrack,
        preferredLanguage: audioPolicyDecision.trackPolicy.preferredLanguage,
        preferredChannelLayout:
          audioPolicyDecision.trackPolicy.preferredChannelLayout,
        allowFallbackStereo:
          audioPolicyDecision.trackPolicy.allowFallbackStereo,
      },
      capabilityProfile:
        audioPolicyDecision.capabilityProfile === null
          ? null
          : {
              canPlayCommittedAudio:
                audioPolicyDecision.capabilityProfile.canPlayCommittedAudio,
              canAttemptPremiumAudio:
                audioPolicyDecision.capabilityProfile.canAttemptPremiumAudio,
              canFallbackStereo:
                audioPolicyDecision.capabilityProfile.canFallbackStereo,
              canKeepPreviewMuted:
                audioPolicyDecision.capabilityProfile.canKeepPreviewMuted,
              canKeepExtractionSilent:
                audioPolicyDecision.capabilityProfile.canKeepExtractionSilent,
            },
      committedPlaybackLane: audioPolicyDecision.committedPlaybackLane,
      reasons: [...audioPolicyDecision.reasons],
      reasonDetails: [...audioPolicyDecision.reasonDetails],
    };
  }

  /**
   * @brief Clone VFS startup debug state for read-only execution snapshots
   *
   * @param startupDebugState - Startup debug state to clone
   *
   * @returns Cloned startup debug state, or `null` when absent
   */
  private cloneStartupDebugState(
    startupDebugState: MediaStartupDebugState | null,
  ): MediaStartupDebugState | null {
    if (startupDebugState === null) {
      return null;
    }

    return {
      phase: startupDebugState.phase,
      sourceId: startupDebugState.sourceId,
      warmResult:
        startupDebugState.warmResult === null
          ? null
          : {
              manifest:
                startupDebugState.warmResult.manifest === null
                  ? null
                  : {
                      entry:
                        startupDebugState.warmResult.manifest.entry === null
                          ? null
                          : {
                              ...startupDebugState.warmResult.manifest.entry,
                              source: {
                                ...startupDebugState.warmResult.manifest.entry
                                  .source,
                              },
                            },
                      lookupSteps:
                        startupDebugState.warmResult.manifest.lookupSteps.map(
                          (
                            lookupStep: (typeof startupDebugState.warmResult.manifest.lookupSteps)[number],
                          ): (typeof startupDebugState.warmResult.manifest.lookupSteps)[number] => ({
                            ...lookupStep,
                          }),
                        ),
                      resolvedLayer:
                        startupDebugState.warmResult.manifest.resolvedLayer,
                      fallbackReason:
                        startupDebugState.warmResult.manifest.fallbackReason,
                      statusCode:
                        startupDebugState.warmResult.manifest.statusCode,
                    },
              initSegment:
                startupDebugState.warmResult.initSegment === null
                  ? null
                  : this.cloneStartupWindowResult(
                      startupDebugState.warmResult.initSegment,
                    ),
              startupWindow:
                startupDebugState.warmResult.startupWindow === null
                  ? null
                  : this.cloneStartupWindowResult(
                      startupDebugState.warmResult.startupWindow,
                    ),
              hotRange:
                startupDebugState.warmResult.hotRange === null
                  ? null
                  : this.cloneStartupWindowResult(
                      startupDebugState.warmResult.hotRange,
                    ),
              notes: [...startupDebugState.warmResult.notes],
            },
      directRuntimeFallbackReason:
        startupDebugState.directRuntimeFallbackReason,
    };
  }

  /**
   * @brief Clone one startup-window lookup result for shared debug output
   *
   * @param startupWindowResult - Startup-window result to clone
   *
   * @returns Cloned startup-window result
   */
  private cloneStartupWindowResult(
    startupWindowResult: NonNullable<
      MediaStartupDebugState["warmResult"]
    >["startupWindow"],
  ): NonNullable<MediaStartupDebugState["warmResult"]>["startupWindow"] {
    if (startupWindowResult === null) {
      return null;
    }

    return {
      entry:
        startupWindowResult.entry === null
          ? null
          : {
              descriptor: {
                ...startupWindowResult.entry.descriptor,
                source: {
                  ...startupWindowResult.entry.descriptor.source,
                },
                range: {
                  ...startupWindowResult.entry.descriptor.range,
                },
              },
              tier: startupWindowResult.entry.tier,
              bytes: new Uint8Array(startupWindowResult.entry.bytes),
              contentType: startupWindowResult.entry.contentType,
              storedAt: startupWindowResult.entry.storedAt,
              byteLength: startupWindowResult.entry.byteLength,
            },
      lookupSteps: startupWindowResult.lookupSteps.map(
        (
          lookupStep: (typeof startupWindowResult.lookupSteps)[number],
        ): (typeof startupWindowResult.lookupSteps)[number] => ({
          ...lookupStep,
        }),
      ),
      resolvedLayer: startupWindowResult.resolvedLayer,
      fallbackReason: startupWindowResult.fallbackReason,
      statusCode: startupWindowResult.statusCode,
    };
  }

  /**
   * @brief Clone one preview session assignment for read-only state output
   *
   * @param previewSessionAssignment - Preview assignment to clone
   *
   * @returns Cloned preview assignment, or `null` when absent
   */
  private clonePreviewSessionAssignment(
    previewSessionAssignment: PreviewSessionAssignment | null,
  ): PreviewSessionAssignment | null {
    if (previewSessionAssignment === null) {
      return null;
    }

    return {
      sessionId: previewSessionAssignment.sessionId,
      itemId: previewSessionAssignment.itemId,
      slotId: previewSessionAssignment.slotId,
      warmState: previewSessionAssignment.warmState,
      isActive: previewSessionAssignment.isActive,
    };
  }

  /**
   * @brief Clone committed playback state for read-only execution snapshots
   *
   * @param committedPlayback - Committed playback state to clone
   *
   * @returns Cloned committed playback state, or `null` when absent
   */
  private cloneCommittedPlaybackSnapshot(
    committedPlayback: CommittedPlaybackSnapshot | null,
  ): CommittedPlaybackSnapshot | null {
    if (committedPlayback === null) {
      return null;
    }

    return {
      itemId: committedPlayback.itemId,
      selectedItemId: committedPlayback.selectedItemId,
      activeItemId: committedPlayback.activeItemId,
      lifecycleState: committedPlayback.lifecycleState,
      intent: {
        intentType: committedPlayback.intent.intentType,
        selectedItemId: committedPlayback.intent.selectedItemId,
        activeItemId: committedPlayback.intent.activeItemId,
        targetItemId: committedPlayback.intent.targetItemId,
        startPositionSeconds: committedPlayback.intent.startPositionSeconds,
      },
      decision: {
        mode: committedPlayback.decision.mode,
        capabilitySnapshot: {
          cacheKey: committedPlayback.decision.capabilitySnapshot.cacheKey,
          request: {
            role: committedPlayback.decision.capabilitySnapshot.request.role,
            appCapabilityProfile:
              committedPlayback.decision.capabilitySnapshot.request
                .appCapabilityProfile === null
                ? null
                : {
                    supportsNativePlayback:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsNativePlayback,
                    supportsShakaPlayback:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsShakaPlayback,
                    supportsPreviewVideo:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsPreviewVideo,
                    supportsThumbnailExtraction:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsThumbnailExtraction,
                    supportsWorkerOffload:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsWorkerOffload,
                    supportsWebGPUPreferred:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsWebGPUPreferred,
                    supportsWebGLFallback:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsWebGLFallback,
                    supportsCustomPipeline:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsCustomPipeline,
                    supportsPremiumPlayback:
                      committedPlayback.decision.capabilitySnapshot.request
                        .appCapabilityProfile.supportsPremiumPlayback,
                    previewSchedulerBudget: {
                      maxWarmSessions:
                        committedPlayback.decision.capabilitySnapshot.request
                          .appCapabilityProfile.previewSchedulerBudget
                          .maxWarmSessions,
                      maxActivePreviewSessions:
                        committedPlayback.decision.capabilitySnapshot.request
                          .appCapabilityProfile.previewSchedulerBudget
                          .maxActivePreviewSessions,
                      maxHiddenSessions:
                        committedPlayback.decision.capabilitySnapshot.request
                          .appCapabilityProfile.previewSchedulerBudget
                          .maxHiddenSessions,
                      maxPreviewReuseMs:
                        committedPlayback.decision.capabilitySnapshot.request
                          .appCapabilityProfile.previewSchedulerBudget
                          .maxPreviewReuseMs,
                      maxPreviewOverlapMs:
                        committedPlayback.decision.capabilitySnapshot.request
                          .appCapabilityProfile.previewSchedulerBudget
                          .maxPreviewOverlapMs,
                      keepWarmAfterBlurMs:
                        committedPlayback.decision.capabilitySnapshot.request
                          .appCapabilityProfile.previewSchedulerBudget
                          .keepWarmAfterBlurMs,
                    },
                  },
            runtimeCapabilities:
              committedPlayback.decision.capabilitySnapshot.request
                .runtimeCapabilities === null
                ? null
                : {
                    canWarmFirstFrame:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.canWarmFirstFrame,
                    canActivateBackground:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.canActivateBackground,
                    canPreviewInline:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.canPreviewInline,
                    canKeepHiddenWarmSession:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.canKeepHiddenWarmSession,
                    canPromoteWarmSession:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.canPromoteWarmSession,
                    canRunMultipleWarmSessions:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.canRunMultipleWarmSessions,
                    supportsCommittedPlayback:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.supportsCommittedPlayback,
                    supportsPremiumCommittedPlayback:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.supportsPremiumCommittedPlayback,
                    committedPlaybackLanePreference:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.committedPlaybackLanePreference,
                    committedPlaybackLanes: [
                      ...committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.committedPlaybackLanes,
                    ],
                    existingBackgroundPlaybackLane:
                      committedPlayback.decision.capabilitySnapshot.request
                        .runtimeCapabilities.existingBackgroundPlaybackLane,
                    previewSchedulerBudget: {
                      maxWarmSessions:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.previewSchedulerBudget
                          .maxWarmSessions,
                      maxActivePreviewSessions:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.previewSchedulerBudget
                          .maxActivePreviewSessions,
                      maxHiddenSessions:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.previewSchedulerBudget
                          .maxHiddenSessions,
                      maxPreviewReuseMs:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.previewSchedulerBudget
                          .maxPreviewReuseMs,
                      maxPreviewOverlapMs:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.previewSchedulerBudget
                          .maxPreviewOverlapMs,
                      keepWarmAfterBlurMs:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.previewSchedulerBudget
                          .keepWarmAfterBlurMs,
                    },
                    audioCapabilities: {
                      canPlayCommittedAudio:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.audioCapabilities
                          .canPlayCommittedAudio,
                      canAttemptPremiumAudio:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.audioCapabilities
                          .canAttemptPremiumAudio,
                      canFallbackStereo:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.audioCapabilities
                          .canFallbackStereo,
                      canKeepPreviewMuted:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.audioCapabilities
                          .canKeepPreviewMuted,
                      canKeepExtractionSilent:
                        committedPlayback.decision.capabilitySnapshot.request
                          .runtimeCapabilities.audioCapabilities
                          .canKeepExtractionSilent,
                    },
                  },
            preferredLaneHint:
              committedPlayback.decision.capabilitySnapshot.request
                .preferredLaneHint,
            preferredRendererKindHint:
              committedPlayback.decision.capabilitySnapshot.request
                .preferredRendererKindHint,
            existingChosenLane:
              committedPlayback.decision.capabilitySnapshot.request
                .existingChosenLane,
            runtimeLanePreference:
              committedPlayback.decision.capabilitySnapshot.request
                .runtimeLanePreference,
          },
          probeResult: {
            overallSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .overallSupportLevel,
            nativeLaneSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .nativeLaneSupportLevel,
            shakaLaneSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .shakaLaneSupportLevel,
            customLaneSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .customLaneSupportLevel,
            nativeRendererSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .nativeRendererSupportLevel,
            webgpuRendererSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .webgpuRendererSupportLevel,
            webglRendererSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .webglRendererSupportLevel,
            premiumPlaybackSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .premiumPlaybackSupportLevel,
            workerOffloadSupportLevel:
              committedPlayback.decision.capabilitySnapshot.probeResult
                .workerOffloadSupportLevel,
          },
          decision: {
            supportLevel:
              committedPlayback.decision.capabilitySnapshot.decision
                .supportLevel,
            preferredLaneOrder: [
              ...committedPlayback.decision.capabilitySnapshot.decision
                .preferredLaneOrder,
            ],
            preferredFallbackLaneOrder: [
              ...committedPlayback.decision.capabilitySnapshot.decision
                .preferredFallbackLaneOrder,
            ],
            preferredRendererOrder: [
              ...committedPlayback.decision.capabilitySnapshot.decision
                .preferredRendererOrder,
            ],
            premiumPlaybackViable:
              committedPlayback.decision.capabilitySnapshot.decision
                .premiumPlaybackViable,
            workerOffloadViable:
              committedPlayback.decision.capabilitySnapshot.decision
                .workerOffloadViable,
            reasons: [
              ...committedPlayback.decision.capabilitySnapshot.decision.reasons,
            ],
            notes: [
              ...committedPlayback.decision.capabilitySnapshot.decision.notes,
            ],
          },
        },
        qualitySelection: {
          role: committedPlayback.decision.qualitySelection.role,
          desiredQualityTier:
            committedPlayback.decision.qualitySelection.desiredQualityTier,
          preferStartupLatency:
            committedPlayback.decision.qualitySelection.preferStartupLatency,
          preferImageQuality:
            committedPlayback.decision.qualitySelection.preferImageQuality,
          preferPremiumPlayback:
            committedPlayback.decision.qualitySelection.preferPremiumPlayback,
          maxWidth: committedPlayback.decision.qualitySelection.maxWidth,
          maxHeight: committedPlayback.decision.qualitySelection.maxHeight,
          maxBandwidth:
            committedPlayback.decision.qualitySelection.maxBandwidth,
          reasons: [...committedPlayback.decision.qualitySelection.reasons],
          notes: [...committedPlayback.decision.qualitySelection.notes],
        },
        preferredLaneOrder: [...committedPlayback.decision.preferredLaneOrder],
        preferredLane: committedPlayback.decision.preferredLane,
        chosenLane: committedPlayback.decision.chosenLane,
        preferredRendererKind: committedPlayback.decision.preferredRendererKind,
        fallbackOrder: [...committedPlayback.decision.fallbackOrder],
        premiumPlaybackViable: committedPlayback.decision.premiumPlaybackViable,
        reasons: [...committedPlayback.decision.reasons],
        reasonDetails: [...committedPlayback.decision.reasonDetails],
        audioPolicyDecision: this.cloneAudioPolicyDecision(
          committedPlayback.decision.audioPolicyDecision,
        ),
        audioTrackPolicy: {
          preferPremiumAudio:
            committedPlayback.decision.audioTrackPolicy.preferPremiumAudio,
          preferDefaultTrack:
            committedPlayback.decision.audioTrackPolicy.preferDefaultTrack,
          preferredLanguage:
            committedPlayback.decision.audioTrackPolicy.preferredLanguage,
          preferredChannelLayout:
            committedPlayback.decision.audioTrackPolicy.preferredChannelLayout,
          allowFallbackStereo:
            committedPlayback.decision.audioTrackPolicy.allowFallbackStereo,
        },
        audioActivationMode: committedPlayback.decision.audioActivationMode,
        usedPreferredLane: committedPlayback.decision.usedPreferredLane,
        usedFallbackLane: committedPlayback.decision.usedFallbackLane,
        lanePreference: committedPlayback.decision.lanePreference,
        startPositionSeconds: committedPlayback.decision.startPositionSeconds,
      },
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
      capabilitySnapshot: plannedSession.capabilitySnapshot,
      fallbackPlaybackLaneOrder: [...plannedSession.fallbackPlaybackLaneOrder],
      desiredPlaybackLane: plannedSession.desiredPlaybackLane,
      variantSelection: plannedSession.variantSelection,
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
      originType: sourceDescriptor.originType,
      url: sourceDescriptor.url,
      mimeType: sourceDescriptor.mimeType,
      posterUrl: sourceDescriptor.posterUrl,
    };
  }

  /**
   * @brief Publish that committed playback reached its first visual-ready frame
   */
  public markCommittedPlaybackVisualReady(): void {
    let didUpdateCommittedPlayback: boolean = false;

    for (const executionSnapshot of this.executionSnapshotsBySessionId.values()) {
      if (
        executionSnapshot.planSession?.role !== "background" ||
        executionSnapshot.state !== "waiting-first-frame"
      ) {
        continue;
      }

      const nextExecutionSnapshot: MediaExecutionSnapshot = {
        ...this.cloneExecutionSnapshot(executionSnapshot),
        state: "background-active",
        committedPlayback: this.transitionCommittedPlaybackSnapshot(
          executionSnapshot.committedPlayback,
          "background-active",
        ),
      };

      this.executionSnapshotsBySessionId.set(
        executionSnapshot.sessionId,
        nextExecutionSnapshot,
      );
      this.syncKernelSessionState(nextExecutionSnapshot);
      didUpdateCommittedPlayback = true;
    }

    if (didUpdateCommittedPlayback) {
      this.notifyStateListeners();
    }
  }

  /**
   * @brief Build one committed playback decision for a background session
   *
   * @param plannedSession - Planned session being prepared for execution
   * @param runtimeId - Runtime identifier owned by the current adapter
   * @param runtimeCapabilities - Runtime capabilities owned by the adapter
   * @param currentMediaKernelState - Current immutable media kernel state
   * @param currentExecutionSnapshot - Existing execution snapshot, when one exists
   *
   * @returns Committed playback decision, or `null` when the session is not background-backed
   */
  private resolveCommittedPlaybackDecision(
    plannedSession: MediaPlanSession,
    runtimeId: string,
    runtimeCapabilities: MediaRuntimeCapabilities,
    currentMediaKernelState: MediaKernelState,
    currentExecutionSnapshot: MediaExecutionSnapshot | undefined,
  ): CommittedPlaybackDecision | null {
    if (plannedSession.role !== "background") {
      return null;
    }

    const committedPlaybackIntent: CommittedPlaybackIntent =
      this.createCommittedPlaybackIntent(
        plannedSession,
        currentMediaKernelState,
      );

    return CommittedPlaybackChooser.choose({
      intent: committedPlaybackIntent,
      sourceDescriptor: plannedSession.source,
      appCapabilityProfile: this.resolveAppCapabilityProfile(
        currentMediaKernelState,
        runtimeId,
      ),
      runtimeCapabilities,
      currentExecutionSnapshot: currentExecutionSnapshot ?? null,
      preferredLaneHint: plannedSession.desiredPlaybackLane,
      preferredRendererKindHint: plannedSession.desiredRendererKind,
      audioTrackPolicy: AudioPolicy.createDefaultTrackPolicy("background"),
    });
  }

  /**
   * @brief Resolve the shared requested audio state for one planned session
   *
   * @param plannedSession - Planned session being prepared for execution
   * @param runtimeCapabilities - Runtime capabilities owned by the active adapter
   * @param committedPlaybackDecision - Chosen committed playback decision, when available
   *
   * @returns Requested audio execution snapshot, or `null` when the session has no audio policy
   */
  private resolveRequestedAudioExecution(
    plannedSession: MediaPlanSession,
    runtimeCapabilities: MediaRuntimeCapabilities,
    committedPlaybackDecision: CommittedPlaybackDecision | null,
  ): AudioExecutionSnapshot | null {
    let audioPolicyDecision: AudioPolicyDecision | null = null;

    if (
      plannedSession.role === "background" &&
      committedPlaybackDecision !== null
    ) {
      audioPolicyDecision = this.cloneAudioPolicyDecision(
        committedPlaybackDecision.audioPolicyDecision,
      );
    } else if (plannedSession.role === "preview") {
      audioPolicyDecision = AudioPolicy.decide({
        activationIntent: {
          sessionRole: "preview",
          committedPlaybackIntentType: null,
          committedPlaybackMode: null,
          committedPlaybackLane: plannedSession.desiredPlaybackLane,
          sourceDescriptor: plannedSession.source,
        },
        runtimeAudioCapabilities: runtimeCapabilities.audioCapabilities,
        audioTrackPolicy: AudioPolicy.createDefaultTrackPolicy("preview"),
      });
    }

    if (audioPolicyDecision === null) {
      return null;
    }

    return {
      requestedAudioMode: audioPolicyDecision.audioMode,
      actualAudioMode: audioPolicyDecision.audioMode,
      fallbackMode: audioPolicyDecision.fallbackMode,
      premiumAttemptRequested: audioPolicyDecision.requestedPremiumAttempt,
      usedFallback: audioPolicyDecision.usedFallback,
      runtimeAcceptedRequestedMode: null,
      policyDecision: audioPolicyDecision,
      runtimeReason: null,
    };
  }

  /**
   * @brief Build committed playback debug state for one background session
   *
   * @param plannedSession - Planned session being described
   * @param currentMediaKernelState - Current immutable media kernel state
   * @param committedPlaybackDecision - Chosen committed playback decision
   * @param lifecycleState - Lifecycle state to publish
   *
   * @returns Committed playback snapshot, or `null` when the session is not background-backed
   */
  private createCommittedPlaybackSnapshot(
    plannedSession: MediaPlanSession | null,
    currentMediaKernelState: MediaKernelState,
    committedPlaybackDecision: CommittedPlaybackDecision | null,
    lifecycleState: CommittedPlaybackLifecycleState,
  ): CommittedPlaybackSnapshot | null {
    if (
      plannedSession?.role !== "background" ||
      committedPlaybackDecision === null
    ) {
      return null;
    }

    const committedPlaybackIntent: CommittedPlaybackIntent =
      this.createCommittedPlaybackIntent(
        plannedSession,
        currentMediaKernelState,
      );

    return {
      itemId: plannedSession.itemId,
      selectedItemId: currentMediaKernelState.selectedItemId,
      activeItemId: currentMediaKernelState.activeItemId,
      lifecycleState,
      intent: committedPlaybackIntent,
      decision: committedPlaybackDecision,
    };
  }

  /**
   * @brief Build a committed playback intent from the current plan and kernel state
   *
   * @param plannedSession - Planned background session
   * @param currentMediaKernelState - Current immutable media kernel state
   *
   * @returns Committed playback intent used by the chooser
   */
  private createCommittedPlaybackIntent(
    plannedSession: MediaPlanSession,
    currentMediaKernelState: MediaKernelState,
  ): CommittedPlaybackIntent {
    return {
      intentType:
        plannedSession.reason.intentType === "selected"
          ? "selected"
          : "background-active",
      selectedItemId: currentMediaKernelState.selectedItemId,
      activeItemId: currentMediaKernelState.activeItemId,
      targetItemId: plannedSession.itemId,
      startPositionSeconds: 0,
    };
  }

  /**
   * @brief Resolve the app capability profile reported by the active runtime
   *
   * @param currentMediaKernelState - Current immutable media kernel state
   * @param runtimeId - Runtime identifier to resolve
   *
   * @returns Matching app capability profile, or `null` when none was reported
   */
  private resolveAppCapabilityProfile(
    currentMediaKernelState: MediaKernelState,
    runtimeId: string,
  ): MediaCapabilityProfile | null {
    const appMediaCapabilities:
      | MediaKernelState["appCapabilities"][number]
      | undefined = currentMediaKernelState.appCapabilities.find(
      (candidateAppMediaCapabilities): boolean =>
        candidateAppMediaCapabilities.appId === runtimeId,
    );

    return appMediaCapabilities?.profile ?? null;
  }

  /**
   * @brief Convert execution state into a committed playback lifecycle state
   *
   * @param executionState - Shared execution state
   * @param fallbackLifecycleState - Existing lifecycle state when no mapping applies
   *
   * @returns Lifecycle state aligned with committed playback semantics
   */
  private resolveCommittedPlaybackLifecycleState(
    executionState: MediaExecutionState,
    fallbackLifecycleState: CommittedPlaybackLifecycleState,
  ): CommittedPlaybackLifecycleState {
    switch (executionState) {
      case "activating-background":
        return "activating-background";
      case "waiting-first-frame":
        return "waiting-first-frame";
      case "background-active":
        return "background-active";
      default:
        return fallbackLifecycleState;
    }
  }

  /**
   * @brief Replace the lifecycle state published by a committed playback snapshot
   *
   * @param committedPlaybackSnapshot - Existing committed playback snapshot
   * @param lifecycleState - Next lifecycle state
   *
   * @returns Updated committed playback snapshot, or `null` when absent
   */
  private transitionCommittedPlaybackSnapshot(
    committedPlaybackSnapshot: CommittedPlaybackSnapshot | null,
    lifecycleState: CommittedPlaybackLifecycleState,
  ): CommittedPlaybackSnapshot | null {
    if (committedPlaybackSnapshot === null) {
      return null;
    }

    const clonedCommittedPlaybackSnapshot: CommittedPlaybackSnapshot =
      this.cloneCommittedPlaybackSnapshot(committedPlaybackSnapshot) ??
      committedPlaybackSnapshot;

    return {
      ...clonedCommittedPlaybackSnapshot,
      lifecycleState,
    };
  }

  /**
   * @brief Compare two committed playback decisions for change detection
   *
   * @param leftCommittedPlaybackDecision - Previous committed playback decision
   * @param rightCommittedPlaybackDecision - Next committed playback decision
   *
   * @returns `true` when both decisions are equivalent
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
      JSON.stringify(leftCommittedPlaybackDecision.capabilitySnapshot) ===
        JSON.stringify(rightCommittedPlaybackDecision.capabilitySnapshot) &&
      JSON.stringify(leftCommittedPlaybackDecision.qualitySelection) ===
        JSON.stringify(rightCommittedPlaybackDecision.qualitySelection) &&
      JSON.stringify(leftCommittedPlaybackDecision.preferredLaneOrder) ===
        JSON.stringify(rightCommittedPlaybackDecision.preferredLaneOrder) &&
      leftCommittedPlaybackDecision.preferredLane ===
        rightCommittedPlaybackDecision.preferredLane &&
      leftCommittedPlaybackDecision.chosenLane ===
        rightCommittedPlaybackDecision.chosenLane &&
      leftCommittedPlaybackDecision.preferredRendererKind ===
        rightCommittedPlaybackDecision.preferredRendererKind &&
      JSON.stringify(leftCommittedPlaybackDecision.audioPolicyDecision) ===
        JSON.stringify(rightCommittedPlaybackDecision.audioPolicyDecision) &&
      JSON.stringify(leftCommittedPlaybackDecision.audioTrackPolicy) ===
        JSON.stringify(rightCommittedPlaybackDecision.audioTrackPolicy) &&
      leftCommittedPlaybackDecision.audioActivationMode ===
        rightCommittedPlaybackDecision.audioActivationMode &&
      leftCommittedPlaybackDecision.usedPreferredLane ===
        rightCommittedPlaybackDecision.usedPreferredLane &&
      leftCommittedPlaybackDecision.usedFallbackLane ===
        rightCommittedPlaybackDecision.usedFallbackLane &&
      leftCommittedPlaybackDecision.premiumPlaybackViable ===
        rightCommittedPlaybackDecision.premiumPlaybackViable &&
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
          JSON.stringify(plannedSession.capabilitySnapshot),
          JSON.stringify(plannedSession.fallbackPlaybackLaneOrder),
          plannedSession.desiredPlaybackLane ?? "null",
          JSON.stringify(plannedSession.variantSelection),
          plannedSession.desiredRendererKind,
          plannedSession.desiredWarmth,
          plannedSession.priority,
          plannedSession.visibility,
          plannedSession.reason.intentType,
          plannedSession.reason.kind,
        ].join("|"),
      )
      .join("||")
      .concat(":::", JSON.stringify(mediaPlan.previewFarm));
  }

  /**
   * @brief Build a preview slot assignment from one runtime command result
   *
   * @param plannedSession - Planned preview session receiving runtime work
   * @param runtimeSessionHandle - Runtime handle returned by the adapter
   * @param state - Latest execution state reported by the runtime
   *
   * @returns Preview session assignment, or `null` when the session is not preview-backed
   */
  private createPreviewSessionAssignment(
    plannedSession: MediaPlanSession,
    runtimeSessionHandle: MediaRuntimeSessionHandle | null,
    state: MediaExecutionState,
  ): PreviewSessionAssignment | null {
    if (
      plannedSession.role !== "preview" ||
      plannedSession.itemId === null ||
      runtimeSessionHandle === null
    ) {
      return null;
    }

    return {
      sessionId: plannedSession.sessionId,
      itemId: plannedSession.itemId,
      slotId: runtimeSessionHandle.handleId,
      warmState:
        state === "preview-active"
          ? "preview-active"
          : state === "warming-metadata" || state === "warming-first-frame"
            ? "warming"
            : state === "ready-first-frame"
              ? "ready-first-frame"
              : state === "disposed"
                ? "evicted"
                : "cold",
      isActive: state === "preview-active",
    };
  }
}
