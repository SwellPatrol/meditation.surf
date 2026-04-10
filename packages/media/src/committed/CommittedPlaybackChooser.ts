/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaCapabilityProfile } from "../capabilities/MediaCapabilityProfile";
import type { MediaExecutionSnapshot } from "../execution/MediaExecutionSnapshot";
import type { MediaRuntimeCapabilities } from "../execution/MediaRuntimeCapabilities";
import type { MediaPlaybackLane } from "../sessions/MediaPlaybackLane";
import type { MediaRendererKind } from "../sessions/MediaRendererKind";
import type { MediaSourceDescriptor } from "../sources/MediaSourceDescriptor";
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
};

/**
 * @brief Pure chooser for committed playback lane and audio activation policy
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
    const lanePreference: CommittedPlaybackLanePreference | null =
      runtimeCapabilities?.committedPlaybackLanePreference ?? null;
    const existingChosenLane: MediaPlaybackLane | null =
      input.currentExecutionSnapshot?.committedPlayback?.decision.chosenLane ??
      null;
    const supportedLanes: MediaPlaybackLane[] =
      runtimeCapabilities?.committedPlaybackLanes.filter(
        (lane: MediaPlaybackLane): boolean =>
          this.isLaneSupportedByProfile(lane, appCapabilityProfile),
      ) ?? [];
    const fallbackOrder: MediaPlaybackLane[] = this.createFallbackOrder(
      lanePreference,
      input.preferredLaneHint,
      runtimeCapabilities?.existingBackgroundPlaybackLane ?? null,
      existingChosenLane,
      supportedLanes,
    );
    const preferredLane: MediaPlaybackLane | null = fallbackOrder[0] ?? null;
    const chosenLane: MediaPlaybackLane | null =
      fallbackOrder.find((lane: MediaPlaybackLane): boolean =>
        supportedLanes.includes(lane),
      ) ?? null;
    const usedFallbackLane: boolean =
      chosenLane !== null &&
      preferredLane !== null &&
      chosenLane !== preferredLane;
    const reasons: CommittedPlaybackDecisionReason[] = [];
    const reasonDetails: string[] = [];
    const mode: CommittedPlaybackMode = this.selectMode(
      input,
      chosenLane,
      runtimeCapabilities,
      reasons,
      reasonDetails,
    );
    const audioActivationMode: AudioActivationMode = this.selectAudioMode(
      input.intent,
      runtimeCapabilities,
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

    if (
      input.intent.intentType === "background-active" &&
      audioActivationMode === "muted-preview"
    ) {
      reasons.push("background-only-path");
      reasonDetails.push(
        "Existing background playback remains on its muted compatibility path.",
      );
    }

    return {
      mode,
      preferredLane,
      chosenLane,
      preferredRendererKind:
        chosenLane === "native" || chosenLane === "shaka"
          ? "native-plane"
          : chosenLane === "custom"
            ? (input.preferredRendererKindHint ?? "none")
            : input.preferredRendererKindHint,
      fallbackOrder,
      reasons,
      reasonDetails,
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
   * @brief Build a stable fallback order for lane selection
   *
   * @param lanePreference - Runtime lane preference
   * @param preferredLaneHint - Planner-provided lane hint
   * @param existingBackgroundPlaybackLane - Safe existing background lane
   * @param supportedLanes - Runtime lanes that remain viable after filtering
   *
   * @returns Deduplicated lane order used for selection and debug output
   */
  private static createFallbackOrder(
    lanePreference: CommittedPlaybackLanePreference | null,
    preferredLaneHint: MediaPlaybackLane | null,
    existingBackgroundPlaybackLane: MediaPlaybackLane | null,
    existingChosenLane: MediaPlaybackLane | null,
    supportedLanes: MediaPlaybackLane[],
  ): MediaPlaybackLane[] {
    const orderedLanes: Array<MediaPlaybackLane | null> = [];

    if (lanePreference === "prefer-native") {
      orderedLanes.push(
        "native",
        preferredLaneHint,
        existingChosenLane,
        "shaka",
      );
    } else if (lanePreference === "prefer-shaka") {
      orderedLanes.push(
        "shaka",
        preferredLaneHint,
        existingChosenLane,
        "native",
      );
    } else if (lanePreference === "prefer-existing-runtime") {
      orderedLanes.push(
        existingBackgroundPlaybackLane,
        preferredLaneHint,
        existingChosenLane,
        "native",
        "shaka",
        "custom",
      );
    } else {
      orderedLanes.push(
        preferredLaneHint,
        existingChosenLane,
        existingBackgroundPlaybackLane,
        "native",
        "shaka",
        "custom",
      );
    }

    for (const supportedLane of supportedLanes) {
      orderedLanes.push(supportedLane);
    }

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
   * @param runtimeCapabilities - Runtime execution capabilities
   * @param reasons - Mutable reason collection
   * @param reasonDetails - Mutable human-readable detail collection
   *
   * @returns Chosen committed playback mode
   */
  private static selectMode(
    input: CommittedPlaybackChooserInput,
    chosenLane: MediaPlaybackLane | null,
    runtimeCapabilities: MediaRuntimeCapabilities | null,
    reasons: CommittedPlaybackDecisionReason[],
    reasonDetails: string[],
  ): CommittedPlaybackMode {
    if (chosenLane === null) {
      return "fallback-basic";
    }

    if (
      input.intent.intentType === "selected" &&
      input.appCapabilityProfile?.supportsPremiumPlayback === true &&
      runtimeCapabilities?.supportsPremiumCommittedPlayback === true
    ) {
      reasons.push("premium-supported");
      reasonDetails.push(
        "Runtime and app capabilities allow a premium committed playback attempt.",
      );
      return "premium-attempt";
    }

    if (input.appCapabilityProfile?.supportsPremiumPlayback !== true) {
      reasons.push("premium-unsupported");
      reasonDetails.push(
        "The current app profile does not report premium committed playback support.",
      );
    } else if (runtimeCapabilities?.supportsPremiumCommittedPlayback !== true) {
      reasons.push("premium-unsupported");
      reasonDetails.push(
        "The current runtime adapter does not expose a premium committed playback lane yet.",
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
   * @brief Choose the audio policy associated with one committed playback decision
   *
   * @param intent - Committed playback intent
   * @param runtimeCapabilities - Runtime execution capabilities
   * @param mode - Previously chosen playback mode
   * @param reasons - Mutable reason collection
   * @param reasonDetails - Mutable human-readable detail collection
   *
   * @returns Chosen audio activation mode
   */
  private static selectAudioMode(
    intent: CommittedPlaybackIntent,
    runtimeCapabilities: MediaRuntimeCapabilities | null,
    mode: CommittedPlaybackMode,
    reasons: CommittedPlaybackDecisionReason[],
    reasonDetails: string[],
  ): AudioActivationMode {
    if (intent.intentType !== "selected") {
      return "muted-preview";
    }

    if (
      mode === "premium-attempt" &&
      runtimeCapabilities?.supportsPremiumAudioActivation === true
    ) {
      return "premium-attempt";
    }

    if (runtimeCapabilities?.supportsCommittedPlaybackAudio === true) {
      return "committed-playback";
    }

    if (runtimeCapabilities?.supportsFallbackStereoAudio === true) {
      return "fallback-stereo";
    }

    reasons.push("runtime-limited");
    reasonDetails.push(
      "Committed playback audio fell back because the runtime exposes no richer audio activation path.",
    );
    return "muted-preview";
  }
}
