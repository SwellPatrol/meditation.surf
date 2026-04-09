/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaItem } from "../catalog/MediaItem";
import type { MediaCapabilityProfile } from "./MediaCapabilityProfile";
import type { MediaIntent } from "./MediaIntent";
import type { MediaKernelState } from "./MediaKernelState";
import type { MediaPlan } from "./MediaPlan";
import type { MediaPlanReason } from "./MediaPlanReason";
import type { MediaPlanSession } from "./MediaPlanSession";
import type { MediaPlaybackLane } from "./MediaPlaybackLane";
import type { MediaRendererKind } from "./MediaRendererKind";
import type { MediaSessionRole } from "./MediaSessionRole";
import type { MediaSourceDescriptor } from "./MediaSourceDescriptor";
import { MediaSourceDescriptorFactory } from "./MediaSourceDescriptorFactory";
import type { MediaWarmth } from "./MediaWarmth";

/**
 * @brief Deterministic inputs used to build one shared media session plan
 */
export type MediaSessionPlannerInput = {
  appCapabilityProfile: MediaCapabilityProfile | null;
  currentMediaKernelState: MediaKernelState;
  mediaIntent: MediaIntent | null;
  focusedItem: MediaItem | null;
  selectedItem: MediaItem | null;
  activeItem: MediaItem | null;
};

/**
 * @brief Convert shared browse and playback intent into logical media sessions
 *
 * The planner is intentionally pure. It does not mutate controller state,
 * start playback, or inspect any runtime objects beyond immutable descriptors.
 */
export class MediaSessionPlanner {
  /**
   * @brief Build a deterministic session plan for the current orchestration inputs
   *
   * @param input - Current capability, intent, and content context
   *
   * @returns Planned sessions ordered by importance and role
   */
  public static createPlan(input: MediaSessionPlannerInput): MediaPlan {
    const plannedSessions: MediaPlanSession[] = [];
    const focusedItem: MediaItem | null = input.focusedItem;
    const selectedItem: MediaItem | null = input.selectedItem;
    const activeItem: MediaItem | null = input.activeItem;
    const appCapabilityProfile: MediaCapabilityProfile | null =
      input.appCapabilityProfile;
    const currentIntentType: MediaIntent["type"] =
      input.mediaIntent?.type ?? "idle";

    if (
      focusedItem !== null &&
      appCapabilityProfile?.supportsPreviewVideo === true &&
      focusedItem.id !== selectedItem?.id &&
      focusedItem.id !== activeItem?.id
    ) {
      plannedSessions.push(
        this.createPreviewSession(
          focusedItem,
          currentIntentType === "focused-delay-elapsed"
            ? "focused-delay-elapsed"
            : "focused",
          appCapabilityProfile,
        ),
      );
    }

    const backgroundItem: MediaItem | null = selectedItem ?? activeItem;

    if (backgroundItem !== null) {
      plannedSessions.push(
        this.createBackgroundSession(
          backgroundItem,
          selectedItem !== null ? "selected" : "background-active",
          appCapabilityProfile,
          selectedItem !== null ? "selected-item" : "background-active-item",
        ),
      );
    } else if (
      currentIntentType === "idle" &&
      this.hasActiveBackgroundSession(input.currentMediaKernelState)
    ) {
      plannedSessions.push(
        this.createPreservedBackgroundSession(
          input.currentMediaKernelState,
          appCapabilityProfile,
        ),
      );
    }

    return {
      sessions: plannedSessions.sort(
        (
          leftPlannedSession: MediaPlanSession,
          rightPlannedSession: MediaPlanSession,
        ): number =>
          this.comparePlannedSessions(leftPlannedSession, rightPlannedSession),
      ),
    };
  }

  /**
   * @brief Determine whether the current kernel already tracks an active background session
   *
   * @param currentMediaKernelState - Current immutable kernel snapshot
   *
   * @returns `true` when a background session already exists in active state
   */
  private static hasActiveBackgroundSession(
    currentMediaKernelState: MediaKernelState,
  ): boolean {
    return currentMediaKernelState.sessions.some(
      (sessionSnapshot: MediaKernelState["sessions"][number]): boolean =>
        sessionSnapshot.descriptor.role === "background" &&
        this.isActiveBackgroundSessionState(sessionSnapshot.state),
    );
  }

  /**
   * @brief Create a preview-oriented session plan entry
   *
   * @param mediaItem - Item that currently owns browse focus
   * @param intentType - Logical intent that led to preview planning
   * @param appCapabilityProfile - Runtime capability profile for the current app
   *
   * @returns Planned preview session
   */
  private static createPreviewSession(
    mediaItem: MediaItem,
    intentType: "focused" | "focused-delay-elapsed",
    appCapabilityProfile: MediaCapabilityProfile | null,
  ): MediaPlanSession {
    const sourceDescriptor: MediaSourceDescriptor =
      MediaSourceDescriptorFactory.createForMediaItem(mediaItem);
    const previewWarmth: MediaWarmth =
      intentType === "focused-delay-elapsed" ? "preloaded" : "first-frame";
    const reason: MediaPlanReason = {
      intentType,
      kind:
        intentType === "focused-delay-elapsed"
          ? "focused-delay-elapsed-item"
          : "focused-item",
      message:
        intentType === "focused-delay-elapsed"
          ? "Focused item stayed active long enough to justify a warmer preview session"
          : "Focused item should warm a preview session when preview video is supported",
    };

    return {
      sessionId: this.createSessionId("preview", sourceDescriptor),
      itemId: mediaItem.id,
      source: sourceDescriptor,
      role: "preview",
      desiredPlaybackLane: this.selectPreviewPlaybackLane(appCapabilityProfile),
      desiredRendererKind: this.selectRendererKind(appCapabilityProfile),
      desiredWarmth: previewWarmth,
      priority: intentType === "focused-delay-elapsed" ? "high" : "normal",
      visibility: "hidden",
      reason,
    };
  }

  /**
   * @brief Create a background-oriented session plan entry
   *
   * @param mediaItem - Item that should own the logical background session
   * @param intentType - Logical intent that led to background planning
   * @param appCapabilityProfile - Runtime capability profile for the current app
   * @param reasonKind - Reason variant recorded in debug output
   *
   * @returns Planned background session
   */
  private static createBackgroundSession(
    mediaItem: MediaItem,
    intentType: "selected" | "background-active",
    appCapabilityProfile: MediaCapabilityProfile | null,
    reasonKind: "selected-item" | "background-active-item",
  ): MediaPlanSession {
    const sourceDescriptor: MediaSourceDescriptor =
      MediaSourceDescriptorFactory.createForMediaItem(mediaItem);

    return {
      sessionId: this.createSessionId("background", sourceDescriptor),
      itemId: mediaItem.id,
      source: sourceDescriptor,
      role: "background",
      desiredPlaybackLane:
        this.selectBackgroundPlaybackLane(appCapabilityProfile),
      desiredRendererKind: this.selectRendererKind(appCapabilityProfile),
      desiredWarmth: "active",
      priority: "critical",
      visibility: "visible",
      reason: {
        intentType,
        kind: reasonKind,
        message:
          reasonKind === "selected-item"
            ? "Selected item should own the background playback session"
            : "Current active playback item should remain the background playback target",
      },
    };
  }

  /**
   * @brief Preserve an already-active background session when no stronger target exists
   *
   * @param currentMediaKernelState - Current immutable kernel snapshot
   * @param appCapabilityProfile - Runtime capability profile for the current app
   *
   * @returns Planned background session copied from the active shared session snapshot
   */
  private static createPreservedBackgroundSession(
    currentMediaKernelState: MediaKernelState,
    appCapabilityProfile: MediaCapabilityProfile | null,
  ): MediaPlanSession {
    const activeBackgroundSession:
      | MediaKernelState["sessions"][number]
      | undefined = currentMediaKernelState.sessions.find(
      (sessionSnapshot: MediaKernelState["sessions"][number]): boolean =>
        sessionSnapshot.descriptor.role === "background" &&
        this.isActiveBackgroundSessionState(sessionSnapshot.state),
    );
    const sourceDescriptor: MediaSourceDescriptor | null =
      activeBackgroundSession?.descriptor.source ?? null;

    return {
      sessionId:
        activeBackgroundSession?.descriptor.sessionId ??
        this.createFallbackSessionId("background", sourceDescriptor),
      itemId: activeBackgroundSession?.descriptor.itemId ?? null,
      source: sourceDescriptor,
      role: "background",
      desiredPlaybackLane:
        this.selectBackgroundPlaybackLane(appCapabilityProfile),
      desiredRendererKind: this.selectRendererKind(appCapabilityProfile),
      desiredWarmth: "active",
      priority: "high",
      visibility: "visible",
      reason: {
        intentType: "idle",
        kind: "preserve-existing-background-session",
        message:
          "Keep the existing active background session planned while no stronger intent is present",
      },
    };
  }

  /**
   * @brief Create a stable logical session identifier from role and source
   *
   * @param role - Logical role assigned to the session
   * @param sourceDescriptor - Shared source descriptor for the session
   *
   * @returns Stable session identifier
   */
  private static createSessionId(
    role: MediaSessionRole,
    sourceDescriptor: MediaSourceDescriptor,
  ): string {
    return `${role}:${sourceDescriptor.sourceId}`;
  }

  /**
   * @brief Create a fallback session identifier when a source is absent
   *
   * @param role - Logical role assigned to the session
   * @param sourceDescriptor - Optional source descriptor for the session
   *
   * @returns Stable best-effort session identifier
   */
  private static createFallbackSessionId(
    role: MediaSessionRole,
    sourceDescriptor: MediaSourceDescriptor | null,
  ): string {
    return `${role}:${sourceDescriptor?.sourceId ?? "unknown"}`;
  }

  /**
   * @brief Determine whether a session state should count as an active background owner
   *
   * @param mediaSessionState - Shared lifecycle state recorded for a session
   *
   * @returns `true` when the session is already warm enough to preserve
   */
  private static isActiveBackgroundSessionState(
    mediaSessionState: MediaKernelState["sessions"][number]["state"],
  ): boolean {
    return (
      mediaSessionState === "previewing" ||
      mediaSessionState === "playing" ||
      mediaSessionState === "paused"
    );
  }

  /**
   * @brief Select the most conservative preview playback lane supported by the app
   *
   * @param appCapabilityProfile - Runtime capability profile for the current app
   *
   * @returns Lane preferred for preview planning, or `null` when unsupported
   */
  private static selectPreviewPlaybackLane(
    appCapabilityProfile: MediaCapabilityProfile | null,
  ): MediaPlaybackLane | null {
    if (appCapabilityProfile === null) {
      return null;
    }

    if (appCapabilityProfile.supportsNativePlayback) {
      return "native";
    }

    if (appCapabilityProfile.supportsShakaPlayback) {
      return "shaka";
    }

    if (appCapabilityProfile.supportsCustomPipeline) {
      return "custom";
    }

    return null;
  }

  /**
   * @brief Select the strongest background playback lane supported by the app
   *
   * @param appCapabilityProfile - Runtime capability profile for the current app
   *
   * @returns Lane preferred for background planning, or `null` when unsupported
   */
  private static selectBackgroundPlaybackLane(
    appCapabilityProfile: MediaCapabilityProfile | null,
  ): MediaPlaybackLane | null {
    if (appCapabilityProfile === null) {
      return null;
    }

    if (
      appCapabilityProfile.supportsPremiumPlayback &&
      appCapabilityProfile.supportsCustomPipeline
    ) {
      return "custom";
    }

    if (
      appCapabilityProfile.supportsPremiumPlayback &&
      appCapabilityProfile.supportsShakaPlayback
    ) {
      return "shaka";
    }

    if (appCapabilityProfile.supportsNativePlayback) {
      return "native";
    }

    if (appCapabilityProfile.supportsShakaPlayback) {
      return "shaka";
    }

    if (appCapabilityProfile.supportsCustomPipeline) {
      return "custom";
    }

    return null;
  }

  /**
   * @brief Select the current best-fit renderer family without activating advanced pipelines
   *
   * @param appCapabilityProfile - Runtime capability profile for the current app
   *
   * @returns Renderer family that best matches the current app capabilities
   */
  private static selectRendererKind(
    appCapabilityProfile: MediaCapabilityProfile | null,
  ): MediaRendererKind {
    if (appCapabilityProfile?.supportsNativePlayback === true) {
      return "native-plane";
    }

    return "none";
  }

  /**
   * @brief Provide deterministic ordering for debug-friendly plan output
   *
   * @param leftPlannedSession - First session being compared
   * @param rightPlannedSession - Second session being compared
   *
   * @returns Sort order used in the shared plan snapshot
   */
  private static comparePlannedSessions(
    leftPlannedSession: MediaPlanSession,
    rightPlannedSession: MediaPlanSession,
  ): number {
    const leftPriorityRank: number = this.getPriorityRank(
      leftPlannedSession.priority,
    );
    const rightPriorityRank: number = this.getPriorityRank(
      rightPlannedSession.priority,
    );

    if (leftPriorityRank !== rightPriorityRank) {
      return rightPriorityRank - leftPriorityRank;
    }

    if (leftPlannedSession.role !== rightPlannedSession.role) {
      return leftPlannedSession.role.localeCompare(rightPlannedSession.role);
    }

    return leftPlannedSession.sessionId.localeCompare(
      rightPlannedSession.sessionId,
    );
  }

  /**
   * @brief Convert a priority label into a stable numeric sort rank
   *
   * @param priority - Priority label being compared
   *
   * @returns Numeric rank for deterministic sorting
   */
  private static getPriorityRank(
    priority: MediaPlanSession["priority"],
  ): number {
    switch (priority) {
      case "critical":
        return 4;
      case "high":
        return 3;
      case "normal":
        return 2;
      case "low":
        return 1;
    }
  }
}
