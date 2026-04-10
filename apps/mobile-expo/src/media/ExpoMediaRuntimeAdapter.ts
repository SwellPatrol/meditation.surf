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
    supportsCommittedPlayback: true,
    supportsPremiumCommittedPlayback: false,
    committedPlaybackLanePreference: "prefer-native",
    committedPlaybackLanes: ["native"],
    existingBackgroundPlaybackLane: "native",
    previewSchedulerBudget: {
      maxWarmSessions: 0,
      maxActivePreviewSessions: 0,
      maxHiddenSessions: 0,
      maxPreviewReuseMs: 2000,
      maxPreviewOverlapMs: 0,
      keepWarmAfterBlurMs: 0,
    },
    audioCapabilities: {
      canPlayCommittedAudio: true,
      canAttemptPremiumAudio: false,
      canFallbackStereo: true,
      canKeepPreviewMuted: true,
      canKeepExtractionSilent: true,
    },
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
      committedPlaybackLanes: [
        ...ExpoMediaRuntimeAdapter.CAPABILITIES.committedPlaybackLanes,
      ],
      previewSchedulerBudget: {
        maxWarmSessions:
          ExpoMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxWarmSessions,
        maxActivePreviewSessions:
          ExpoMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxActivePreviewSessions,
        maxHiddenSessions:
          ExpoMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxHiddenSessions,
        maxPreviewReuseMs:
          ExpoMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxPreviewReuseMs,
        maxPreviewOverlapMs:
          ExpoMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .maxPreviewOverlapMs,
        keepWarmAfterBlurMs:
          ExpoMediaRuntimeAdapter.CAPABILITIES.previewSchedulerBudget
            .keepWarmAfterBlurMs,
      },
      audioCapabilities: {
        canPlayCommittedAudio:
          ExpoMediaRuntimeAdapter.CAPABILITIES.audioCapabilities
            .canPlayCommittedAudio,
        canAttemptPremiumAudio:
          ExpoMediaRuntimeAdapter.CAPABILITIES.audioCapabilities
            .canAttemptPremiumAudio,
        canFallbackStereo:
          ExpoMediaRuntimeAdapter.CAPABILITIES.audioCapabilities
            .canFallbackStereo,
        canKeepPreviewMuted:
          ExpoMediaRuntimeAdapter.CAPABILITIES.audioCapabilities
            .canKeepPreviewMuted,
        canKeepExtractionSilent:
          ExpoMediaRuntimeAdapter.CAPABILITIES.audioCapabilities
            .canKeepExtractionSilent,
      },
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
          null,
          null,
        );
      case "warm-session":
        return this.createResult(
          "unsupported",
          this.createRuntimeSessionHandle(command),
          null,
          "Expo preview warming is not implemented in this phase.",
          this.createAcceptedAudioExecution(command, false),
        );
      case "activate-session":
        return this.handleActivateSession(command);
      case "deactivate-session":
      case "dispose-session":
        return this.createResult(
          "inactive",
          command.runtimeSessionHandle,
          null,
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
    const committedPlaybackDecision: CommittedPlaybackDecision | null =
      command.committedPlaybackDecision;

    if (command.session?.role !== "background") {
      return this.createResult(
        "unsupported",
        runtimeSessionHandle,
        committedPlaybackDecision,
        "Expo activation is only wired for background sessions in this phase.",
        this.createAcceptedAudioExecution(command, false),
      );
    }

    if (mediaItem === null) {
      return this.createResult(
        "failed",
        runtimeSessionHandle,
        committedPlaybackDecision,
        `Expo runtime could not resolve media item ${targetItemId ?? "null"}.`,
        this.createAcceptedAudioExecution(command, false),
      );
    }

    this.playbackSequenceController.setCommittedPlayback(
      mediaItem,
      committedPlaybackDecision,
    );

    return this.createResult(
      "waiting-first-frame",
      runtimeSessionHandle,
      committedPlaybackDecision,
      null,
      this.createAcceptedAudioExecution(command, true),
    );
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
    const runtimeHandleId: string =
      command.session?.role === "preview"
        ? "preview-session"
        : command.session?.role === "background"
          ? "background-session"
          : "global";

    return {
      handleId: runtimeHandleId,
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
    committedPlaybackDecision: CommittedPlaybackDecision | null,
    failureReason: string | null,
    audioExecution: MediaExecutionResult["audioExecution"] = null,
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
      audioExecution:
        audioExecution === null
          ? null
          : {
              requestedAudioMode: audioExecution.requestedAudioMode,
              actualAudioMode: audioExecution.actualAudioMode,
              fallbackMode: audioExecution.fallbackMode,
              premiumAttemptRequested: audioExecution.premiumAttemptRequested,
              usedFallback: audioExecution.usedFallback,
              runtimeAcceptedRequestedMode:
                audioExecution.runtimeAcceptedRequestedMode,
              policyDecision: {
                audioMode: audioExecution.policyDecision.audioMode,
                fallbackMode: audioExecution.policyDecision.fallbackMode,
                requestedPremiumAttempt:
                  audioExecution.policyDecision.requestedPremiumAttempt,
                usedFallback: audioExecution.policyDecision.usedFallback,
                trackPolicy: {
                  preferPremiumAudio:
                    audioExecution.policyDecision.trackPolicy
                      .preferPremiumAudio,
                  preferDefaultTrack:
                    audioExecution.policyDecision.trackPolicy
                      .preferDefaultTrack,
                  preferredLanguage:
                    audioExecution.policyDecision.trackPolicy.preferredLanguage,
                  preferredChannelLayout:
                    audioExecution.policyDecision.trackPolicy
                      .preferredChannelLayout,
                  allowFallbackStereo:
                    audioExecution.policyDecision.trackPolicy
                      .allowFallbackStereo,
                },
                capabilityProfile:
                  audioExecution.policyDecision.capabilityProfile === null
                    ? null
                    : {
                        canPlayCommittedAudio:
                          audioExecution.policyDecision.capabilityProfile
                            .canPlayCommittedAudio,
                        canAttemptPremiumAudio:
                          audioExecution.policyDecision.capabilityProfile
                            .canAttemptPremiumAudio,
                        canFallbackStereo:
                          audioExecution.policyDecision.capabilityProfile
                            .canFallbackStereo,
                        canKeepPreviewMuted:
                          audioExecution.policyDecision.capabilityProfile
                            .canKeepPreviewMuted,
                        canKeepExtractionSilent:
                          audioExecution.policyDecision.capabilityProfile
                            .canKeepExtractionSilent,
                      },
                committedPlaybackLane:
                  audioExecution.policyDecision.committedPlaybackLane,
                reasons: [...audioExecution.policyDecision.reasons],
                reasonDetails: [...audioExecution.policyDecision.reasonDetails],
              },
              runtimeReason: audioExecution.runtimeReason,
            },
      failureReason,
      startupDebugState: null,
    };
  }

  /**
   * @brief Reflect whether Expo accepted the requested shared audio mode
   *
   * @param command - Shared execution command carrying the requested audio state
   * @param runtimeAcceptedRequestedMode - Whether Expo honored the request
   *
   * @returns Cloned audio execution snapshot, or `null` when absent
   */
  private createAcceptedAudioExecution(
    command: MediaExecutionCommand,
    runtimeAcceptedRequestedMode: boolean,
  ): MediaExecutionResult["audioExecution"] {
    const requestedAudioExecution: MediaExecutionCommand["audioExecution"] =
      command.audioExecution;

    if (requestedAudioExecution === null) {
      return null;
    }

    return {
      requestedAudioMode: requestedAudioExecution.requestedAudioMode,
      actualAudioMode: requestedAudioExecution.requestedAudioMode,
      fallbackMode: requestedAudioExecution.fallbackMode,
      premiumAttemptRequested: requestedAudioExecution.premiumAttemptRequested,
      usedFallback: requestedAudioExecution.usedFallback,
      runtimeAcceptedRequestedMode,
      policyDecision: requestedAudioExecution.policyDecision,
      runtimeReason:
        runtimeAcceptedRequestedMode === true
          ? null
          : "Expo did not execute the requested shared audio mode for this command.",
    };
  }
}
