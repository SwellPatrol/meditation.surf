/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaThumbnailCandidateFrame } from "./MediaThumbnailCandidateFrame";
import type { MediaThumbnailExtractionPolicy } from "./MediaThumbnailExtractionPolicy";
import type { MediaThumbnailFrameRejectionReason } from "./MediaThumbnailFrameRejectionReason";
import type { MediaThumbnailSelectionDecision } from "./MediaThumbnailSelectionDecision";
import type { MediaThumbnailSelectionReason } from "./MediaThumbnailSelectionReason";

/**
 * @brief Pure shared selector for deterministic thumbnail frame choices
 *
 * The selector intentionally uses small brightness heuristics only. Runtime
 * adapters remain responsible for actual frame decoding and pixel access.
 */
export class MediaThumbnailFrameSelector {
  /**
   * @brief Build the candidate frame times associated with one extraction policy
   *
   * @param extractionPolicy - Shared extraction policy being executed
   * @param timeHintMs - Optional external time hint requested by callers
   *
   * @returns Ordered frame times that the runtime may inspect
   */
  public static createCandidateFrameTimes(
    extractionPolicy: MediaThumbnailExtractionPolicy,
    timeHintMs: number | null,
  ): number[] {
    if (extractionPolicy.strategy === "time-hint") {
      return [Math.max(0, Math.round(timeHintMs ?? 0))];
    }

    if (extractionPolicy.strategy === "first-frame") {
      return [0];
    }

    const candidateFrameTimesMs: number[] = [];
    const boundedWindowMs: number = Math.max(
      0,
      extractionPolicy.candidateWindowMs,
    );
    const boundedStepMs: number = Math.max(
      1,
      extractionPolicy.candidateFrameStepMs,
    );
    const maxCandidateFrames: number = Math.max(
      1,
      extractionPolicy.maxCandidateFrames,
    );

    for (
      let candidateIndex: number = 0;
      candidateIndex < maxCandidateFrames;
      candidateIndex += 1
    ) {
      const candidateFrameTimeMs: number = Math.min(
        boundedWindowMs,
        candidateIndex * boundedStepMs,
      );

      if (
        candidateFrameTimesMs.length > 0 &&
        candidateFrameTimesMs[candidateFrameTimesMs.length - 1] ===
          candidateFrameTimeMs
      ) {
        break;
      }

      candidateFrameTimesMs.push(candidateFrameTimeMs);

      if (candidateFrameTimeMs >= boundedWindowMs) {
        break;
      }
    }

    return candidateFrameTimesMs.length > 0 ? candidateFrameTimesMs : [0];
  }

  /**
   * @brief Select one thumbnail frame from bounded runtime-provided candidates
   *
   * @param extractionPolicy - Shared extraction policy being evaluated
   * @param candidateFrames - Candidate frames already inspected by the runtime
   *
   * @returns Immutable shared selection decision
   */
  public static selectCandidateFrame(
    extractionPolicy: MediaThumbnailExtractionPolicy,
    candidateFrames: readonly MediaThumbnailCandidateFrame[],
  ): MediaThumbnailSelectionDecision {
    const clonedCandidateFrames: MediaThumbnailCandidateFrame[] =
      candidateFrames.map(
        (
          candidateFrame: MediaThumbnailCandidateFrame,
        ): MediaThumbnailCandidateFrame =>
          this.cloneCandidateFrame(candidateFrame),
      );

    if (extractionPolicy.strategy !== "first-non-black") {
      const firstDecodableCandidateIndex: number =
        clonedCandidateFrames.findIndex(
          (candidateFrame: MediaThumbnailCandidateFrame): boolean =>
            candidateFrame.isDecodable,
        );

      if (firstDecodableCandidateIndex < 0) {
        return this.createSelectionDecision(
          extractionPolicy,
          clonedCandidateFrames,
          "fallback-first-decodable",
          null,
          false,
        );
      }

      return this.createSelectionDecision(
        extractionPolicy,
        clonedCandidateFrames,
        "first-frame-accepted",
        firstDecodableCandidateIndex,
        false,
      );
    }

    let firstDecodableCandidateIndex: number | null = null;

    for (const [
      candidateIndex,
      candidateFrame,
    ] of clonedCandidateFrames.entries()) {
      if (candidateFrame.isDecodable && firstDecodableCandidateIndex === null) {
        firstDecodableCandidateIndex = candidateIndex;
      }

      const rejectionReason: MediaThumbnailFrameRejectionReason | null =
        this.getRejectionReason(extractionPolicy, candidateFrame);

      candidateFrame.rejectionReason = rejectionReason;

      if (rejectionReason !== null) {
        continue;
      }

      return this.createSelectionDecision(
        extractionPolicy,
        clonedCandidateFrames,
        candidateIndex === 0
          ? "first-frame-accepted"
          : "first-non-black-selected",
        candidateIndex,
        false,
      );
    }

    if (firstDecodableCandidateIndex !== null) {
      const fallbackSelectionReason: MediaThumbnailSelectionReason =
        extractionPolicy.qualityIntent === "low"
          ? "fallback-low-quality"
          : "fallback-first-decodable";

      return this.createSelectionDecision(
        extractionPolicy,
        clonedCandidateFrames,
        fallbackSelectionReason,
        firstDecodableCandidateIndex,
        true,
      );
    }

    return this.createSelectionDecision(
      extractionPolicy,
      clonedCandidateFrames,
      "fallback-first-decodable",
      null,
      true,
    );
  }

  /**
   * @brief Decide whether one candidate frame should be rejected
   *
   * @param extractionPolicy - Shared extraction policy supplying thresholds
   * @param candidateFrame - Candidate frame being evaluated
   *
   * @returns Rejection reason, or `null` when the candidate is acceptable
   */
  private static getRejectionReason(
    extractionPolicy: MediaThumbnailExtractionPolicy,
    candidateFrame: MediaThumbnailCandidateFrame,
  ): MediaThumbnailFrameRejectionReason | null {
    if (!candidateFrame.isDecodable) {
      return candidateFrame.rejectionReason ?? "decode-failed";
    }

    const averageLuma: number = candidateFrame.averageLuma ?? 0;
    const brightestSampleLuma: number = candidateFrame.brightestSampleLuma ?? 0;
    const darkPixelRatio: number = candidateFrame.darkPixelRatio ?? 1;
    const blackFrameThreshold: number = extractionPolicy.blackFrameThreshold;
    const nearBlackFrameThreshold: number =
      extractionPolicy.nearBlackFrameThreshold;
    const fadeInFrameThreshold: number = extractionPolicy.fadeInFrameThreshold;

    if (
      averageLuma <= blackFrameThreshold ||
      brightestSampleLuma <= blackFrameThreshold
    ) {
      return "black-frame";
    }

    if (
      averageLuma <= fadeInFrameThreshold &&
      darkPixelRatio >= 0.75 &&
      brightestSampleLuma > nearBlackFrameThreshold
    ) {
      return "fade-in-frame";
    }

    if (averageLuma <= nearBlackFrameThreshold || darkPixelRatio >= 0.96) {
      return "near-black-frame";
    }

    return null;
  }

  /**
   * @brief Create one immutable selection decision
   *
   * @param extractionPolicy - Shared extraction policy being reported
   * @param candidateFrames - Candidate frames included in the decision
   * @param selectionReason - Selection reason chosen for the decision
   * @param selectedCandidateIndex - Optional chosen candidate index
   * @param fallbackUsed - Whether the final choice was a fallback
   *
   * @returns Immutable shared selection decision
   */
  private static createSelectionDecision(
    extractionPolicy: MediaThumbnailExtractionPolicy,
    candidateFrames: MediaThumbnailCandidateFrame[],
    selectionReason: MediaThumbnailSelectionReason,
    selectedCandidateIndex: number | null,
    fallbackUsed: boolean,
  ): MediaThumbnailSelectionDecision {
    const rejectionReasons: MediaThumbnailFrameRejectionReason[] =
      candidateFrames.flatMap(
        (
          candidateFrame: MediaThumbnailCandidateFrame,
        ): MediaThumbnailFrameRejectionReason[] =>
          candidateFrame.rejectionReason === null
            ? []
            : [candidateFrame.rejectionReason],
      );

    return {
      requestedStrategy: extractionPolicy.strategy,
      strategyUsed: extractionPolicy.strategy,
      qualityIntent: extractionPolicy.qualityIntent,
      selectionReason,
      resolvedReason: selectionReason,
      selectedFrameTimeMs:
        selectedCandidateIndex === null
          ? null
          : (candidateFrames[selectedCandidateIndex]?.frameTimeMs ?? null),
      selectedCandidateIndex,
      attemptedFrameCount: candidateFrames.length,
      rejectedFrameCount: rejectionReasons.length,
      fallbackUsed,
      cachedArtifactReused: false,
      rejectionReasons,
      candidateFrames: candidateFrames.map(
        (
          candidateFrame: MediaThumbnailCandidateFrame,
        ): MediaThumbnailCandidateFrame =>
          this.cloneCandidateFrame(candidateFrame),
      ),
    };
  }

  /**
   * @brief Clone one candidate frame for immutable shared consumption
   *
   * @param candidateFrame - Candidate frame being cloned
   *
   * @returns Cloned candidate frame
   */
  private static cloneCandidateFrame(
    candidateFrame: MediaThumbnailCandidateFrame,
  ): MediaThumbnailCandidateFrame {
    return {
      attemptIndex: candidateFrame.attemptIndex,
      frameTimeMs: candidateFrame.frameTimeMs,
      averageLuma: candidateFrame.averageLuma,
      darkestSampleLuma: candidateFrame.darkestSampleLuma,
      brightestSampleLuma: candidateFrame.brightestSampleLuma,
      darkPixelRatio: candidateFrame.darkPixelRatio,
      isDecodable: candidateFrame.isDecodable,
      rejectionReason: candidateFrame.rejectionReason,
    };
  }
}
