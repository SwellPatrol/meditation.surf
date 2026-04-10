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
import { MediaInventoryCloner } from "../inventory/MediaInventoryCloner";
import type { MediaInventoryResult } from "../inventory/MediaInventoryResult";
import type { MediaInventorySnapshot } from "../inventory/MediaInventorySnapshot";
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
  inventoryResult: MediaInventoryResult | null;
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
    const inventoryResult: MediaInventoryResult | null =
      input.inventoryResult === null
        ? null
        : MediaInventoryCloner.cloneResult(input.inventoryResult);
    const inventorySnapshot: MediaInventorySnapshot | null =
      inventoryResult?.snapshot ?? null;
    const qualitySelection: VariantSelectionDecision = VariantPolicy.select({
      role: "background-playback",
      capabilitySnapshot,
      inventoryResult,
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
    this.foldInventoryReasons(inventorySnapshot, reasons, reasonDetails);
    const mode: CommittedPlaybackMode = this.selectMode(
      input,
      chosenLane,
      capabilitySnapshot,
      inventorySnapshot,
      qualitySelection,
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
      inventoryResult,
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
      inventoryResult,
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
      premiumAttemptRequested: input.intent.intentType === "selected",
      premiumAttemptAccepted: mode === "premium-attempt",
      premiumFallbackReason:
        mode === "premium-attempt"
          ? null
          : this.resolvePremiumFallbackReason(
              input.intent.intentType,
              capabilitySnapshot,
              inventorySnapshot,
              qualitySelection,
            ),
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
   * @param inventorySnapshot - Inventory snapshot, when available
   * @param qualitySelection - Variant selection resolved for committed playback
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
    inventorySnapshot: MediaInventorySnapshot | null,
    qualitySelection: VariantSelectionDecision,
    runtimeCapabilities: MediaRuntimeCapabilities | null,
    reasons: CommittedPlaybackDecisionReason[],
    reasonDetails: string[],
  ): CommittedPlaybackMode {
    if (chosenLane === null) {
      return "fallback-basic";
    }

    if (
      input.intent.intentType === "selected" &&
      capabilitySnapshot.decision.premiumPlaybackViable &&
      this.isPremiumAttemptPlausible(inventorySnapshot, qualitySelection)
    ) {
      if (
        inventorySnapshot !== null &&
        qualitySelection.selectedVariant?.isPremiumCandidate === true
      ) {
        reasons.push("premium-candidate-available");
      }
      reasons.push("premium-supported");
      reasonDetails.push(
        "Runtime, app capabilities, and available inventory allow a premium committed playback attempt.",
      );
      return "premium-attempt";
    }

    if (
      input.intent.intentType === "selected" &&
      capabilitySnapshot.decision.premiumPlaybackViable
    ) {
      if (
        inventorySnapshot !== null &&
        qualitySelection.selectedVariant?.isPremiumCandidate !== true
      ) {
        reasons.push("premium-candidate-unavailable");
      }
      reasons.push("premium-unsupported");
      reasonDetails.push(
        this.resolvePremiumUnsupportedDetail(
          inventorySnapshot,
          qualitySelection,
        ),
      );
    } else if (!capabilitySnapshot.decision.premiumPlaybackViable) {
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

  /**
   * @brief Fold inventory visibility into committed playback debug output
   *
   * @param inventorySnapshot - Optional inventory snapshot
   * @param reasons - Mutable reason collection
   * @param reasonDetails - Mutable human-readable detail collection
   */
  private static foldInventoryReasons(
    inventorySnapshot: MediaInventorySnapshot | null,
    reasons: CommittedPlaybackDecisionReason[],
    reasonDetails: string[],
  ): void {
    if (inventorySnapshot === null) {
      reasons.push("inventory-unavailable");
      reasonDetails.push(
        "Committed playback selection used fallback policy only because no inventory snapshot was available.",
      );
      return;
    }

    if (inventorySnapshot.supportLevel === "full") {
      reasons.push("inventory-full");
    } else if (inventorySnapshot.supportLevel === "partial") {
      reasons.push("inventory-partial");
    } else {
      reasons.push("inventory-unavailable");
    }

    for (const inventoryNote of inventorySnapshot.notes) {
      if (!reasonDetails.includes(inventoryNote)) {
        reasonDetails.push(inventoryNote);
      }
    }
  }

  /**
   * @brief Determine whether a premium attempt remains plausible with inventory
   *
   * @param inventorySnapshot - Optional inventory snapshot
   * @param qualitySelection - Variant decision resolved for committed playback
   *
   * @returns `true` when a premium attempt remains plausible
   */
  private static isPremiumAttemptPlausible(
    inventorySnapshot: MediaInventorySnapshot | null,
    qualitySelection: VariantSelectionDecision,
  ): boolean {
    if (inventorySnapshot === null) {
      return true;
    }

    if (inventorySnapshot.supportLevel === "unsupported") {
      return true;
    }

    return (
      qualitySelection.selectedVariant?.isPremiumCandidate === true ||
      qualitySelection.matchedAvailableVariant === false
    );
  }

  /**
   * @brief Explain why a premium attempt could not be honored
   *
   * @param inventorySnapshot - Optional inventory snapshot
   * @param qualitySelection - Variant decision resolved for committed playback
   *
   * @returns Human-readable detail string
   */
  private static resolvePremiumUnsupportedDetail(
    inventorySnapshot: MediaInventorySnapshot | null,
    qualitySelection: VariantSelectionDecision,
  ): string {
    if (inventorySnapshot === null) {
      return "Committed playback kept the coarse capability fallback because inventory was unavailable.";
    }

    if (
      inventorySnapshot.supportLevel !== "unsupported" &&
      qualitySelection.selectedVariant?.isPremiumCandidate !== true
    ) {
      return "Inventory showed no plausible premium video variant for committed playback, so the chooser stayed on a standard-compatible mode.";
    }

    return "The capability oracle did not treat premium committed playback as viable for this runtime path.";
  }

  /**
   * @brief Resolve a stable premium fallback reason for shared debug state
   *
   * @param intentType - Current committed playback intent type
   * @param capabilitySnapshot - Capability-oracle snapshot
   * @param inventorySnapshot - Optional inventory snapshot
   * @param qualitySelection - Variant decision resolved for committed playback
   *
   * @returns Human-readable fallback reason, or `null` when none applies
   */
  private static resolvePremiumFallbackReason(
    intentType: CommittedPlaybackIntent["intentType"],
    capabilitySnapshot: MediaRoleCapabilitySnapshot,
    inventorySnapshot: MediaInventorySnapshot | null,
    qualitySelection: VariantSelectionDecision,
  ): string | null {
    if (intentType !== "selected") {
      return "Committed playback did not request a premium attempt for the current background-active intent.";
    }

    if (!capabilitySnapshot.decision.premiumPlaybackViable) {
      return "Capability policy did not allow a premium committed playback attempt.";
    }

    if (
      inventorySnapshot !== null &&
      inventorySnapshot.supportLevel !== "unsupported" &&
      qualitySelection.selectedVariant?.isPremiumCandidate !== true
    ) {
      return "Inventory did not expose a plausible premium video variant for committed playback.";
    }

    return null;
  }
}
