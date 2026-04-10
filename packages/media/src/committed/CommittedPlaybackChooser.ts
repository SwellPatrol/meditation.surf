/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { AudioPolicy } from "../audio/AudioPolicy";
import type { AudioPolicyDecision } from "../audio/AudioPolicyDecision";
import type { AudioTrackPolicy } from "../audio/AudioTrackPolicy";
import type { MediaCapabilityProfile } from "../capabilities/MediaCapabilityProfile";
import { CapabilityOracle } from "../capability-oracle/CapabilityOracle";
import type { MediaRoleCapabilitySnapshot } from "../capability-oracle/MediaRoleCapabilitySnapshot";
import type { MediaExecutionSnapshot } from "../execution/MediaExecutionSnapshot";
import type { MediaRuntimeCapabilities } from "../execution/MediaRuntimeCapabilities";
import type { MediaPlaybackLane } from "../sessions/MediaPlaybackLane";
import type { MediaRendererKind } from "../sessions/MediaRendererKind";
import type { MediaSourceDescriptor } from "../sources/MediaSourceDescriptor";
import { VariantPolicy } from "../variant-policy/VariantPolicy";
import type { VariantSelectionDecision } from "../variant-policy/VariantSelectionDecision";
import type { AudioActivationMode } from "./AudioActivationMode";
import type { CommittedPlaybackDecision } from "./CommittedPlaybackDecision";
import type { CommittedPlaybackDecisionReason } from "./CommittedPlaybackDecisionReason";
import type { CommittedPlaybackIntent } from "./CommittedPlaybackIntent";
import type { CommittedPlaybackLanePreference } from "./CommittedPlaybackLanePreference";
import type { CommittedPlaybackMode } from "./CommittedPlaybackMode";

/**
 * @brief Immutable chooser inputs used for committed playback selection
 */
export type CommittedPlaybackChooserInput = {
  intent: CommittedPlaybackIntent;
  sourceDescriptor: MediaSourceDescriptor | null;
  appCapabilityProfile: MediaCapabilityProfile | null;
  runtimeCapabilities: MediaRuntimeCapabilities | null;
  currentExecutionSnapshot: MediaExecutionSnapshot | null;
  preferredLaneHint: MediaPlaybackLane | null;
  preferredRendererKindHint: MediaRendererKind | null;
  audioTrackPolicy: AudioTrackPolicy | null;
};

/**
 * @brief Pure chooser for committed playback lane and committed audio policy
 */
export class CommittedPlaybackChooser {
  /**
   * @brief Pick the safest committed playback lane for the current runtime
   *
   * @param input - Immutable chooser inputs
   *
   * @returns Deterministic committed playback decision
   */
  public static choose(
    input: CommittedPlaybackChooserInput,
  ): CommittedPlaybackDecision {
    const runtimeCapabilities: MediaRuntimeCapabilities | null =
      input.runtimeCapabilities;
    const appCapabilityProfile: MediaCapabilityProfile | null =
      input.appCapabilityProfile;
    const audioTrackPolicy: AudioTrackPolicy =
      input.audioTrackPolicy ??
      AudioPolicy.createDefaultTrackPolicy("background");
    const lanePreference: CommittedPlaybackLanePreference | null =
      runtimeCapabilities?.committedPlaybackLanePreference ?? null;
    const existingChosenLane: MediaPlaybackLane | null =
      input.currentExecutionSnapshot?.committedPlayback?.decision.chosenLane ??
      null;
    const capabilitySnapshot: MediaRoleCapabilitySnapshot =
      CapabilityOracle.decide({
        role: "background-playback",
        appCapabilityProfile,
        runtimeCapabilities,
        preferredLaneHint: input.preferredLaneHint,
        preferredRendererKindHint: input.preferredRendererKindHint,
        existingChosenLane,
        runtimeLanePreference: lanePreference,
      });
    const qualitySelection: VariantSelectionDecision = VariantPolicy.select({
      role: "background-playback",
      capabilitySnapshot,
      maxWidth: null,
      maxHeight: null,
      maxBandwidth: null,
    });
    const supportedLanes: MediaPlaybackLane[] = this.createSupportedLaneOrder(
      capabilitySnapshot,
      runtimeCapabilities,
      appCapabilityProfile,
    );
    const preferredLaneOrder: MediaPlaybackLane[] =
      capabilitySnapshot.decision.preferredLaneOrder.length > 0
        ? [...capabilitySnapshot.decision.preferredLaneOrder]
        : [...supportedLanes];
    const fallbackOrder: MediaPlaybackLane[] = this.createFallbackOrder(
      capabilitySnapshot,
      input.preferredLaneHint,
      runtimeCapabilities?.existingBackgroundPlaybackLane ?? null,
      existingChosenLane,
    );
    const preferredLane: MediaPlaybackLane | null =
      preferredLaneOrder[0] ?? null;
    const chosenLane: MediaPlaybackLane | null =
      [...preferredLaneOrder, ...fallbackOrder].find(
        (lane: MediaPlaybackLane): boolean => supportedLanes.includes(lane),
      ) ?? null;
    const usedFallbackLane: boolean =
      chosenLane !== null &&
      preferredLane !== null &&
      chosenLane !== preferredLane;
    const reasons: CommittedPlaybackDecisionReason[] = ["capability-oracle"];
    const reasonDetails: string[] = [...capabilitySnapshot.decision.notes];
    const mode: CommittedPlaybackMode = this.selectMode(
      input,
      chosenLane,
      capabilitySnapshot,
      runtimeCapabilities,
      reasons,
      reasonDetails,
    );
    const audioPolicyDecision: AudioPolicyDecision = AudioPolicy.decide({
      activationIntent: {
        sessionRole: "background",
        committedPlaybackIntentType: input.intent.intentType,
        committedPlaybackMode: mode,
        committedPlaybackLane: chosenLane,
        sourceDescriptor: input.sourceDescriptor,
      },
      runtimeAudioCapabilities: runtimeCapabilities?.audioCapabilities ?? null,
      audioTrackPolicy,
    });
    const audioActivationMode: AudioActivationMode =
      audioPolicyDecision.audioMode;

    this.foldAudioPolicyReasons(
      audioPolicyDecision,
      mode,
      reasons,
      reasonDetails,
    );

    if (lanePreference === "prefer-native") {
      reasons.push("runtime-prefers-native");
      reasonDetails.push("Runtime adapter prefers the native committed lane.");
    } else if (lanePreference === "prefer-shaka") {
      reasons.push("runtime-prefers-shaka");
      reasonDetails.push("Runtime adapter prefers the Shaka committed lane.");
    } else if (
      lanePreference === "prefer-existing-runtime" &&
      runtimeCapabilities?.existingBackgroundPlaybackLane !== null
    ) {
      reasons.push("existing-runtime-path");
      reasonDetails.push(
        "Runtime adapter prefers its existing background playback path.",
      );
    }

    if (
      runtimeCapabilities?.supportsCommittedPlayback !== true ||
      input.sourceDescriptor === null
    ) {
      reasons.push("adapter-unsupported");
      reasonDetails.push(
        "Committed playback could not use a richer runtime adapter path.",
      );
    }

    if (chosenLane === null) {
      reasons.push("runtime-limited");
      reasonDetails.push(
        "No committed playback lane was available for the current runtime.",
      );
    } else if (usedFallbackLane) {
      reasons.push("fallback-from-preferred-lane");
      reasonDetails.push(
        `Committed playback fell back from ${preferredLane ?? "none"} to ${chosenLane}.`,
      );
    } else if (supportedLanes.length <= 1) {
      reasons.push("no-better-lane-available");
      reasonDetails.push(
        "Only one realistic committed playback lane was available.",
      );
    }

    return {
      mode,
      capabilitySnapshot,
      qualitySelection,
      preferredLaneOrder,
      preferredLane,
      chosenLane,
      preferredRendererKind:
        capabilitySnapshot.decision.preferredRendererOrder[0] ??
        (chosenLane === "native" || chosenLane === "shaka"
          ? "native-plane"
          : chosenLane === "custom"
            ? (input.preferredRendererKindHint ?? "none")
            : input.preferredRendererKindHint),
      fallbackOrder,
      premiumPlaybackViable: capabilitySnapshot.decision.premiumPlaybackViable,
      reasons,
      reasonDetails,
      audioPolicyDecision,
      audioTrackPolicy,
      audioActivationMode,
      usedPreferredLane: preferredLane !== null && preferredLane === chosenLane,
      usedFallbackLane,
      lanePreference,
      startPositionSeconds: input.intent.startPositionSeconds,
    };
  }

  /**
   * @brief Determine whether a lane is allowed by the app profile
   *
   * @param lane - Candidate playback lane
   * @param appCapabilityProfile - App capability profile for the current shell
   *
   * @returns `true` when the lane is valid for the app profile
   */
  private static isLaneSupportedByProfile(
    lane: MediaPlaybackLane,
    appCapabilityProfile: MediaCapabilityProfile | null,
  ): boolean {
    if (appCapabilityProfile === null) {
      return true;
    }

    switch (lane) {
      case "native":
        return appCapabilityProfile.supportsNativePlayback;
      case "shaka":
        return appCapabilityProfile.supportsShakaPlayback;
      case "custom":
        return appCapabilityProfile.supportsCustomPipeline;
    }
  }

  /**
   * @brief Build the runtime-supported lane list that can satisfy committed playback
   *
   * @param capabilitySnapshot - Capability-oracle decision for committed playback
   * @param runtimeCapabilities - Runtime execution capabilities
   * @param appCapabilityProfile - App profile used to filter impossible lanes
   *
   * @returns Lane order that remains viable after runtime filtering
   */
  private static createSupportedLaneOrder(
    capabilitySnapshot: MediaRoleCapabilitySnapshot,
    runtimeCapabilities: MediaRuntimeCapabilities | null,
    appCapabilityProfile: MediaCapabilityProfile | null,
  ): MediaPlaybackLane[] {
    const runtimeSupportedLanes: MediaPlaybackLane[] =
      runtimeCapabilities?.committedPlaybackLanes.filter(
        (lane: MediaPlaybackLane): boolean =>
          this.isLaneSupportedByProfile(lane, appCapabilityProfile),
      ) ??
      capabilitySnapshot.decision.preferredLaneOrder.filter(
        (lane: MediaPlaybackLane): boolean =>
          this.isLaneSupportedByProfile(lane, appCapabilityProfile),
      );

    if (runtimeSupportedLanes.length > 0) {
      return runtimeSupportedLanes;
    }

    return capabilitySnapshot.decision.preferredLaneOrder.filter(
      (lane: MediaPlaybackLane): boolean =>
        this.isLaneSupportedByProfile(lane, appCapabilityProfile),
    );
  }

  /**
   * @brief Build a stable fallback order for lane selection
   *
   * @param capabilitySnapshot - Capability-oracle decision for committed playback
   * @param preferredLaneHint - Planner-provided lane hint
   * @param existingBackgroundPlaybackLane - Safe existing background lane
   * @param existingChosenLane - Previously chosen committed lane
   *
   * @returns Deduplicated lane order used for fallback and debug output
   */
  private static createFallbackOrder(
    capabilitySnapshot: MediaRoleCapabilitySnapshot,
    preferredLaneHint: MediaPlaybackLane | null,
    existingBackgroundPlaybackLane: MediaPlaybackLane | null,
    existingChosenLane: MediaPlaybackLane | null,
  ): MediaPlaybackLane[] {
    const orderedLanes: Array<MediaPlaybackLane | null> = [
      ...capabilitySnapshot.decision.preferredFallbackLaneOrder,
      preferredLaneHint,
      existingChosenLane,
      existingBackgroundPlaybackLane,
    ];

    const deduplicatedLanes: MediaPlaybackLane[] = [];

    for (const orderedLane of orderedLanes) {
      if (orderedLane === null || deduplicatedLanes.includes(orderedLane)) {
        continue;
      }

      deduplicatedLanes.push(orderedLane);
    }

    return deduplicatedLanes;
  }

  /**
   * @brief Choose the committed playback mode for the selected runtime path
   *
   * @param input - Immutable chooser inputs
   * @param chosenLane - Lane selected for committed playback
   * @param capabilitySnapshot - Capability-oracle snapshot for committed playback
   * @param runtimeCapabilities - Runtime execution capabilities
   * @param reasons - Mutable reason collection
   * @param reasonDetails - Mutable human-readable detail collection
   *
   * @returns Chosen committed playback mode
   */
  private static selectMode(
    input: CommittedPlaybackChooserInput,
    chosenLane: MediaPlaybackLane | null,
    capabilitySnapshot: MediaRoleCapabilitySnapshot,
    runtimeCapabilities: MediaRuntimeCapabilities | null,
    reasons: CommittedPlaybackDecisionReason[],
    reasonDetails: string[],
  ): CommittedPlaybackMode {
    if (chosenLane === null) {
      return "fallback-basic";
    }

    if (
      input.intent.intentType === "selected" &&
      capabilitySnapshot.decision.premiumPlaybackViable
    ) {
      reasons.push("premium-supported");
      reasonDetails.push(
        "Runtime and app capabilities allow a premium committed playback attempt.",
      );
      return "premium-attempt";
    }

    if (!capabilitySnapshot.decision.premiumPlaybackViable) {
      reasons.push("premium-unsupported");
      reasonDetails.push(
        "The capability oracle did not treat premium committed playback as viable for this runtime path.",
      );
    }

    if (
      chosenLane === "custom" &&
      runtimeCapabilities?.existingBackgroundPlaybackLane === "custom"
    ) {
      return "fallback-basic";
    }

    return "standard-compatible";
  }

  /**
   * @brief Fold shared audio-policy reasons into committed playback debug output
   *
   * @param audioPolicyDecision - Resolved shared audio-policy decision
   * @param mode - Previously chosen playback mode
   * @param reasons - Mutable reason collection
   * @param reasonDetails - Mutable human-readable detail collection
   */
  private static foldAudioPolicyReasons(
    audioPolicyDecision: AudioPolicyDecision,
    mode: CommittedPlaybackMode,
    reasons: CommittedPlaybackDecisionReason[],
    reasonDetails: string[],
  ): void {
    if (audioPolicyDecision.audioMode === "premium-attempt") {
      if (!reasons.includes("premium-supported")) {
        reasons.push("premium-supported");
      }
    } else if (mode === "premium-attempt") {
      if (!reasons.includes("premium-unsupported")) {
        reasons.push("premium-unsupported");
      }
      if (
        audioPolicyDecision.usedFallback &&
        !reasons.includes("runtime-limited")
      ) {
        reasons.push("runtime-limited");
      }
    }

    for (const reasonDetail of audioPolicyDecision.reasonDetails) {
      if (!reasonDetails.includes(reasonDetail)) {
        reasonDetails.push(reasonDetail);
      }
    }
  }
}
