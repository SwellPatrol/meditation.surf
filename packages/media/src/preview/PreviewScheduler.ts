/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaIntentType } from "../intent/MediaIntentType";
import type { PreviewCandidate } from "./PreviewCandidate";
import type { PreviewFarmState } from "./PreviewFarmState";
import type { PreviewSchedulerBudget } from "./PreviewSchedulerBudget";
import type { PreviewSchedulerDecision } from "./PreviewSchedulerDecision";
import type { PreviewWarmState } from "./PreviewWarmState";

/**
 * @brief Pure preview-farm scheduler that converts candidates into warm policy
 */
export class PreviewScheduler {
  /**
   * @brief Shared zero-budget configuration for unsupported runtimes
   */
  public static readonly UNSUPPORTED_BUDGET: PreviewSchedulerBudget = {
    maxWarmSessions: 0,
    maxActivePreviewSessions: 0,
    maxHiddenSessions: 0,
    maxPreviewReuseMs: 0,
    maxPreviewOverlapMs: 0,
    keepWarmAfterBlurMs: 0,
  };

  /**
   * @brief Build a deterministic preview-farm state snapshot
   *
   * @param input - Current candidates, runtime budget, and preview history
   *
   * @returns Full preview-farm decision state
   */
  public static createState(input: {
    previewCandidates: PreviewCandidate[];
    supportsPreviewVideo: boolean;
    previewBudget: PreviewSchedulerBudget;
    currentlyPlannedWarmSessionIds: string[];
    currentlyPlannedActiveSessionIds: string[];
    backgroundItemId: string | null;
    mediaIntentType: MediaIntentType;
    nowMs: number;
  }): PreviewFarmState {
    const previewBudget: PreviewSchedulerBudget = this.cloneBudget(
      input.previewBudget,
    );
    const previewCandidates: PreviewCandidate[] = input.previewCandidates
      .filter(
        (previewCandidate: PreviewCandidate): boolean =>
          previewCandidate.itemId !== input.backgroundItemId,
      )
      .sort(
        (
          leftPreviewCandidate: PreviewCandidate,
          rightPreviewCandidate: PreviewCandidate,
        ): number =>
          this.compareCandidates(leftPreviewCandidate, rightPreviewCandidate),
      );
    const supportedWarmBudget: boolean =
      input.supportsPreviewVideo &&
      previewBudget.maxWarmSessions > 0 &&
      previewBudget.maxHiddenSessions >= 0;
    const canActivatePreview: boolean =
      supportedWarmBudget && previewBudget.maxActivePreviewSessions > 0;
    const activeSessionIds: string[] = [];
    const warmedSessionIds: string[] = [];
    const retainedSessionIds: string[] = [];
    const evictedSessionIds: string[] = [];
    const deferredSessionIds: string[] = [];
    const decisions: PreviewSchedulerDecision[] = [];
    const warmedCandidateIds: Set<string> = new Set<string>();
    const activeCandidateIds: Set<string> = new Set<string>();
    let nextTransitionAtMs: number | null = null;

    const activeCandidatePool: PreviewCandidate[] = previewCandidates.filter(
      (previewCandidate: PreviewCandidate): boolean =>
        previewCandidate.reason === "focused-item" &&
        input.mediaIntentType === "focused-delay-elapsed",
    );
    const activeCandidateCount: number = canActivatePreview
      ? Math.min(
          previewBudget.maxActivePreviewSessions,
          activeCandidatePool.length,
        )
      : 0;
    const activeCandidates: PreviewCandidate[] = activeCandidatePool.slice(
      0,
      activeCandidateCount,
    );

    for (const previewCandidate of activeCandidates) {
      activeCandidateIds.add(previewCandidate.candidateId);
      warmedCandidateIds.add(previewCandidate.candidateId);
      activeSessionIds.push(previewCandidate.sessionId);
      warmedSessionIds.push(previewCandidate.sessionId);
    }

    const availableWarmSlots: number = supportedWarmBudget
      ? Math.max(0, previewBudget.maxWarmSessions - activeCandidates.length)
      : 0;
    const availableHiddenSlots: number = supportedWarmBudget
      ? Math.max(0, previewBudget.maxHiddenSessions)
      : 0;
    const hiddenCandidateLimit: number = Math.min(
      availableWarmSlots,
      availableHiddenSlots,
    );
    const hiddenCandidates: PreviewCandidate[] = [];

    for (const previewCandidate of previewCandidates) {
      if (warmedCandidateIds.has(previewCandidate.candidateId)) {
        continue;
      }

      if (!supportedWarmBudget) {
        continue;
      }

      const shouldRetainRecentFocus: boolean =
        previewCandidate.reason === "recent-focus" &&
        this.isWithinRetentionWindow(
          previewCandidate,
          input.nowMs,
          previewBudget.keepWarmAfterBlurMs,
        );

      if (
        hiddenCandidates.length >= hiddenCandidateLimit ||
        (!shouldRetainRecentFocus &&
          previewCandidate.reason === "recent-focus" &&
          !this.isWithinReuseWindow(
            previewCandidate,
            input.nowMs,
            previewBudget.maxPreviewReuseMs,
          ))
      ) {
        continue;
      }

      hiddenCandidates.push(previewCandidate);
      warmedCandidateIds.add(previewCandidate.candidateId);
      warmedSessionIds.push(previewCandidate.sessionId);

      if (shouldRetainRecentFocus) {
        retainedSessionIds.push(previewCandidate.sessionId);
        nextTransitionAtMs = this.selectEarlierTransition(
          nextTransitionAtMs,
          (previewCandidate.lastFocusedAtMs ?? input.nowMs) +
            previewBudget.keepWarmAfterBlurMs,
        );
      }
    }

    for (const previewCandidate of previewCandidates) {
      const isActiveCandidate: boolean = activeCandidateIds.has(
        previewCandidate.candidateId,
      );
      const isWarmedCandidate: boolean = warmedCandidateIds.has(
        previewCandidate.candidateId,
      );
      const wasPlannedWarm: boolean =
        input.currentlyPlannedWarmSessionIds.includes(
          previewCandidate.sessionId,
        );
      const wasPlannedActive: boolean =
        input.currentlyPlannedActiveSessionIds.includes(
          previewCandidate.sessionId,
        );
      const shouldRetain: boolean =
        previewCandidate.reason === "recent-focus" &&
        retainedSessionIds.includes(previewCandidate.sessionId);
      const isDeferred: boolean = !isWarmedCandidate;
      const shouldEvict: boolean =
        !isWarmedCandidate &&
        (previewCandidate.currentWarmState === "preview-active" ||
          previewCandidate.currentWarmState === "ready-first-frame" ||
          previewCandidate.currentWarmState === "warming" ||
          wasPlannedWarm ||
          wasPlannedActive);
      const evictionReason: PreviewSchedulerDecision["evictionReason"] =
        shouldEvict
          ? this.selectEvictionReason(previewCandidate, input, previewBudget)
          : null;
      const deferredReason: PreviewSchedulerDecision["deferredReason"] =
        isDeferred
          ? this.selectDeferredReason(previewCandidate, input, previewBudget)
          : null;
      const targetWarmState: PreviewWarmState = isActiveCandidate
        ? "preview-active"
        : shouldRetain
          ? "cooling-down"
          : isWarmedCandidate
            ? "ready-first-frame"
            : shouldEvict
              ? "evicted"
              : "cold";

      if (isDeferred) {
        deferredSessionIds.push(previewCandidate.sessionId);
      }

      if (shouldEvict) {
        evictedSessionIds.push(previewCandidate.sessionId);
      }

      decisions.push({
        candidateId: previewCandidate.candidateId,
        sessionId: previewCandidate.sessionId,
        itemId: previewCandidate.itemId,
        score: {
          reason: previewCandidate.score.reason,
          baseValue: previewCandidate.score.baseValue,
          reuseBonus: previewCandidate.score.reuseBonus,
          totalValue: previewCandidate.score.totalValue,
        },
        primaryReason: previewCandidate.reason,
        deferredReason,
        evictionReason,
        targetWarmState,
        shouldWarm: isWarmedCandidate,
        shouldActivate: isActiveCandidate,
        shouldRetain,
        shouldEvict,
        isDeferred,
        retainUntilMs:
          shouldRetain && previewCandidate.lastFocusedAtMs !== null
            ? previewCandidate.lastFocusedAtMs +
              previewBudget.keepWarmAfterBlurMs
            : null,
      });
    }

    return {
      budget: previewBudget,
      candidates: previewCandidates.map(
        (previewCandidate: PreviewCandidate): PreviewCandidate => ({
          candidateId: previewCandidate.candidateId,
          sessionId: previewCandidate.sessionId,
          itemId: previewCandidate.itemId,
          source: previewCandidate.source,
          rowIndex: previewCandidate.rowIndex,
          itemIndex: previewCandidate.itemIndex,
          reason: previewCandidate.reason,
          score: {
            reason: previewCandidate.score.reason,
            baseValue: previewCandidate.score.baseValue,
            reuseBonus: previewCandidate.score.reuseBonus,
            totalValue: previewCandidate.score.totalValue,
          },
          currentWarmState: previewCandidate.currentWarmState,
          focusStartedAtMs: previewCandidate.focusStartedAtMs,
          lastFocusedAtMs: previewCandidate.lastFocusedAtMs,
        }),
      ),
      decisions,
      sessionAssignments: [],
      activeSessionIds,
      warmedSessionIds,
      retainedSessionIds,
      evictedSessionIds,
      deferredSessionIds,
      nextTransitionAtMs,
    };
  }

  /**
   * @brief Clone a runtime budget for read-only scheduler output
   *
   * @param previewBudget - Budget to clone
   *
   * @returns Cloned preview budget
   */
  private static cloneBudget(
    previewBudget: PreviewSchedulerBudget,
  ): PreviewSchedulerBudget {
    return {
      maxWarmSessions: previewBudget.maxWarmSessions,
      maxActivePreviewSessions: previewBudget.maxActivePreviewSessions,
      maxHiddenSessions: previewBudget.maxHiddenSessions,
      maxPreviewReuseMs: previewBudget.maxPreviewReuseMs,
      maxPreviewOverlapMs: previewBudget.maxPreviewOverlapMs,
      keepWarmAfterBlurMs: previewBudget.keepWarmAfterBlurMs,
    };
  }

  /**
   * @brief Compare two candidates using total score and stable identifiers
   *
   * @param leftPreviewCandidate - First preview candidate
   * @param rightPreviewCandidate - Second preview candidate
   *
   * @returns Stable sort ordering
   */
  private static compareCandidates(
    leftPreviewCandidate: PreviewCandidate,
    rightPreviewCandidate: PreviewCandidate,
  ): number {
    if (
      leftPreviewCandidate.score.totalValue !==
      rightPreviewCandidate.score.totalValue
    ) {
      return (
        rightPreviewCandidate.score.totalValue -
        leftPreviewCandidate.score.totalValue
      );
    }

    if (leftPreviewCandidate.rowIndex !== rightPreviewCandidate.rowIndex) {
      return (
        (leftPreviewCandidate.rowIndex ?? Number.MAX_SAFE_INTEGER) -
        (rightPreviewCandidate.rowIndex ?? Number.MAX_SAFE_INTEGER)
      );
    }

    if (leftPreviewCandidate.itemIndex !== rightPreviewCandidate.itemIndex) {
      return (
        (leftPreviewCandidate.itemIndex ?? Number.MAX_SAFE_INTEGER) -
        (rightPreviewCandidate.itemIndex ?? Number.MAX_SAFE_INTEGER)
      );
    }

    return leftPreviewCandidate.sessionId.localeCompare(
      rightPreviewCandidate.sessionId,
    );
  }

  /**
   * @brief Determine whether one recent candidate is still warm-retainable
   *
   * @param previewCandidate - Candidate under consideration
   * @param nowMs - Current scheduler timestamp
   * @param keepWarmAfterBlurMs - Warm retention budget
   *
   * @returns `true` when the candidate may stay warm after blur
   */
  private static isWithinRetentionWindow(
    previewCandidate: PreviewCandidate,
    nowMs: number,
    keepWarmAfterBlurMs: number,
  ): boolean {
    if (previewCandidate.lastFocusedAtMs === null) {
      return false;
    }

    return nowMs - previewCandidate.lastFocusedAtMs <= keepWarmAfterBlurMs;
  }

  /**
   * @brief Determine whether one recent candidate is still eligible for reuse
   *
   * @param previewCandidate - Candidate under consideration
   * @param nowMs - Current scheduler timestamp
   * @param maxPreviewReuseMs - Maximum reuse age
   *
   * @returns `true` when the recent focus is still reusable
   */
  private static isWithinReuseWindow(
    previewCandidate: PreviewCandidate,
    nowMs: number,
    maxPreviewReuseMs: number,
  ): boolean {
    if (previewCandidate.lastFocusedAtMs === null) {
      return false;
    }

    return nowMs - previewCandidate.lastFocusedAtMs <= maxPreviewReuseMs;
  }

  /**
   * @brief Keep the nearest upcoming transition timestamp
   *
   * @param currentTransitionAtMs - Currently selected transition time
   * @param candidateTransitionAtMs - Candidate transition time
   *
   * @returns Earliest non-null transition timestamp
   */
  private static selectEarlierTransition(
    currentTransitionAtMs: number | null,
    candidateTransitionAtMs: number,
  ): number {
    if (currentTransitionAtMs === null) {
      return candidateTransitionAtMs;
    }

    return Math.min(currentTransitionAtMs, candidateTransitionAtMs);
  }

  /**
   * @brief Explain why one candidate was deferred instead of warmed
   *
   * @param previewCandidate - Candidate that lost budget competition
   * @param input - Current scheduler inputs
   * @param previewBudget - Active runtime budget
   *
   * @returns Deferred reason used for debug output
   */
  private static selectDeferredReason(
    previewCandidate: PreviewCandidate,
    input: {
      supportsPreviewVideo: boolean;
      previewBudget: PreviewSchedulerBudget;
      currentlyPlannedWarmSessionIds: string[];
      currentlyPlannedActiveSessionIds: string[];
      mediaIntentType: MediaIntentType;
      nowMs: number;
      backgroundItemId: string | null;
      previewCandidates: PreviewCandidate[];
    },
    previewBudget: PreviewSchedulerBudget,
  ): PreviewSchedulerDecision["deferredReason"] {
    if (
      !input.supportsPreviewVideo ||
      previewBudget.maxWarmSessions <= 0 ||
      previewBudget.maxHiddenSessions < 0
    ) {
      return "runtime-unsupported";
    }

    if (previewCandidate.itemId === input.backgroundItemId) {
      return "background-priority";
    }

    if (
      previewCandidate.reason === "recent-focus" &&
      !this.isWithinReuseWindow(
        previewCandidate,
        input.nowMs,
        previewBudget.maxPreviewReuseMs,
      )
    ) {
      return "lower-priority";
    }

    return "over-budget";
  }

  /**
   * @brief Explain why a previously warm candidate is being removed
   *
   * @param previewCandidate - Candidate being evicted
   * @param input - Current scheduler inputs
   * @param previewBudget - Active runtime budget
   *
   * @returns Eviction reason used for debug output
   */
  private static selectEvictionReason(
    previewCandidate: PreviewCandidate,
    input: {
      supportsPreviewVideo: boolean;
      previewBudget: PreviewSchedulerBudget;
      currentlyPlannedWarmSessionIds: string[];
      currentlyPlannedActiveSessionIds: string[];
      mediaIntentType: MediaIntentType;
      nowMs: number;
      backgroundItemId: string | null;
      previewCandidates: PreviewCandidate[];
    },
    previewBudget: PreviewSchedulerBudget,
  ): PreviewSchedulerDecision["evictionReason"] {
    if (
      previewCandidate.reason === "recent-focus" &&
      !this.isWithinReuseWindow(
        previewCandidate,
        input.nowMs,
        previewBudget.maxPreviewReuseMs,
      )
    ) {
      return "reuse-window-expired";
    }

    if (!input.supportsPreviewVideo || previewBudget.maxWarmSessions <= 0) {
      return "runtime-unsupported";
    }

    if (previewCandidate.itemId === input.backgroundItemId) {
      return "background-priority";
    }

    return "over-budget";
  }
}
