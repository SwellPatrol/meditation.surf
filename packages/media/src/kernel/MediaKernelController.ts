/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { AppMediaCapabilities } from "../capabilities/AppMediaCapabilities";
import type { MediaCapabilityProfile } from "../capabilities/MediaCapabilityProfile";
import type { MediaIntent } from "../intent/MediaIntent";
import type { MediaPlan } from "../planning/MediaPlan";
import type { MediaPlanReason } from "../planning/MediaPlanReason";
import type { MediaPlanSession } from "../planning/MediaPlanSession";
import { MediaSessionPlanner } from "../planning/MediaSessionPlanner";
import type { PreviewCandidateInput } from "../preview/PreviewCandidateInput";
import type { PreviewFarmState } from "../preview/PreviewFarmState";
import { PreviewScheduler } from "../preview/PreviewScheduler";
import type { MediaSessionDescriptor } from "../sessions/MediaSessionDescriptor";
import type { MediaSessionSnapshot } from "../sessions/MediaSessionSnapshot";
import type { MediaSessionState } from "../sessions/MediaSessionState";
import type { MediaWarmth } from "../sessions/MediaWarmth";
import type { MediaSourceDescriptor } from "../sources/MediaSourceDescriptor";
import type { MediaKernelItem } from "./MediaKernelItem";
import type { MediaKernelState } from "./MediaKernelState";

/**
 * @brief Listener signature used by the shared media kernel controller
 */
export type MediaKernelStateListener = (state: MediaKernelState) => void;

type MediaSessionDescriptorUpdate = Partial<
  Pick<
    MediaSessionDescriptor,
    "itemId" | "playbackLane" | "rendererKind" | "role" | "source"
  >
>;

/**
 * @brief Own shared media orchestration state without performing playback work
 *
 * The controller tracks logical sessions, app capability reports, high-level
 * intent, focused and active items, and the latest deterministic session plan.
 */
export class MediaKernelController {
  private readonly appCapabilitiesById: Map<string, AppMediaCapabilities>;
  private readonly createSourceDescriptor: (
    mediaItem: MediaKernelItem,
  ) => MediaSourceDescriptor;
  private readonly sessionSnapshotsById: Map<string, MediaSessionSnapshot>;
  private readonly stateListeners: Set<MediaKernelStateListener>;

  private activeItem: MediaKernelItem | null;
  private currentIntent: MediaIntent | null;
  private currentPlan: MediaPlan;
  private focusedItem: MediaKernelItem | null;
  private planningNowMs: number;
  private previewCandidateInputs: PreviewCandidateInput<MediaKernelItem>[];
  private previewFarmTimerId: ReturnType<typeof globalThis.setTimeout> | null;
  private selectedItem: MediaKernelItem | null;

  /**
   * @brief Create a runtime-agnostic media kernel controller
   */
  public constructor(
    createSourceDescriptor:
      | ((mediaItem: MediaKernelItem) => MediaSourceDescriptor)
      | null = null,
  ) {
    this.activeItem = null;
    this.appCapabilitiesById = new Map<string, AppMediaCapabilities>();
    this.createSourceDescriptor =
      createSourceDescriptor ??
      ((mediaItem: MediaKernelItem): MediaSourceDescriptor => {
        void mediaItem;
        throw new Error(
          "MediaKernelController requires a source descriptor factory before planning with media items",
        );
      });
    this.currentIntent = null;
    this.currentPlan = {
      sessions: [],
      previewFarm: this.createEmptyPreviewFarmState(),
    };
    this.focusedItem = null;
    this.planningNowMs = Date.now();
    this.previewCandidateInputs = [];
    this.previewFarmTimerId = null;
    this.selectedItem = null;
    this.sessionSnapshotsById = new Map<string, MediaSessionSnapshot>();
    this.stateListeners = new Set<MediaKernelStateListener>();
  }

  /**
   * @brief Return the current immutable media kernel snapshot
   *
   * @returns Current media kernel state
   */
  public getState(): MediaKernelState {
    const appCapabilities: AppMediaCapabilities[] = [
      ...this.appCapabilitiesById.values(),
    ]
      .sort((left: AppMediaCapabilities, right: AppMediaCapabilities): number =>
        left.appId.localeCompare(right.appId),
      )
      .map(
        (appMediaCapabilities: AppMediaCapabilities): AppMediaCapabilities =>
          this.cloneAppMediaCapabilities(appMediaCapabilities),
      );
    const sessions: MediaSessionSnapshot[] = [
      ...this.sessionSnapshotsById.values(),
    ]
      .sort(
        (
          leftSessionSnapshot: MediaSessionSnapshot,
          rightSessionSnapshot: MediaSessionSnapshot,
        ): number =>
          leftSessionSnapshot.descriptor.sessionId.localeCompare(
            rightSessionSnapshot.descriptor.sessionId,
          ),
      )
      .map(
        (sessionSnapshot: MediaSessionSnapshot): MediaSessionSnapshot =>
          this.cloneSessionSnapshot(sessionSnapshot),
      );

    return {
      activeItemId: this.activeItem?.id ?? null,
      appCapabilities,
      currentIntent: this.cloneMediaIntent(this.currentIntent),
      focusedItemId: this.focusedItem?.id ?? null,
      plan: this.cloneMediaPlan(this.currentPlan),
      selectedItemId: this.selectedItem?.id ?? null,
      sessions,
    };
  }

  /**
   * @brief Return the latest high-level logical media intent
   *
   * @returns Latest logical media intent, or `null` when none is active
   */
  public getIntent(): MediaIntent | null {
    return this.cloneMediaIntent(this.currentIntent);
  }

  /**
   * @brief Return the latest deterministic media session plan
   *
   * @returns Latest session plan
   */
  public getPlan(): MediaPlan {
    return this.cloneMediaPlan(this.currentPlan);
  }

  /**
   * @brief Return the focused media item identifier reflected into the kernel
   *
   * @returns Focused media item identifier, or `null` when no item is focused
   */
  public getFocusedItemId(): string | null {
    return this.focusedItem?.id ?? null;
  }

  /**
   * @brief Return the selected media item identifier reflected into the kernel
   *
   * @returns Selected media item identifier, or `null` when no item is selected
   */
  public getSelectedItemId(): string | null {
    return this.selectedItem?.id ?? null;
  }

  /**
   * @brief Return the active playback media item identifier reflected into the kernel
   *
   * @returns Active media item identifier, or `null` when playback has no item
   */
  public getActiveItemId(): string | null {
    return this.activeItem?.id ?? null;
  }

  /**
   * @brief Build a shared source descriptor for one media item
   *
   * @param mediaItem - Shared media item that owns the source
   *
   * @returns Stable source descriptor for the supplied item
   */
  public getSourceDescriptorForItem(
    mediaItem: MediaKernelItem,
  ): MediaSourceDescriptor {
    const sourceDescriptor: MediaSourceDescriptor =
      this.createSourceDescriptor(mediaItem);

    return {
      sourceId: sourceDescriptor.sourceId,
      kind: sourceDescriptor.kind,
      url: sourceDescriptor.url,
      mimeType: sourceDescriptor.mimeType,
      posterUrl: sourceDescriptor.posterUrl,
    };
  }

  /**
   * @brief Subscribe to media kernel state changes
   *
   * @param listener - Callback notified whenever the media kernel changes
   *
   * @returns Cleanup callback that removes the listener
   */
  public subscribe(listener: MediaKernelStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());

    return (): void => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * @brief Register a logical media session in the shared kernel
   *
   * Registering the same session ID again updates the descriptor while
   * preserving current state, warmth, and failure information.
   *
   * @param descriptor - Shared descriptor for the logical session
   */
  public registerSession(descriptor: MediaSessionDescriptor): void {
    const previousSessionSnapshot: MediaSessionSnapshot | undefined =
      this.sessionSnapshotsById.get(descriptor.sessionId);
    const nextSessionSnapshot: MediaSessionSnapshot = {
      descriptor: this.cloneSessionDescriptor(descriptor),
      state: previousSessionSnapshot?.state ?? "idle",
      warmth: previousSessionSnapshot?.warmth ?? "cold",
      failureReason: previousSessionSnapshot?.failureReason ?? null,
    };

    if (
      previousSessionSnapshot !== undefined &&
      this.areSessionSnapshotsEqual(
        previousSessionSnapshot,
        nextSessionSnapshot,
      )
    ) {
      return;
    }

    this.sessionSnapshotsById.set(descriptor.sessionId, nextSessionSnapshot);
    this.recomputePlan();
    this.notifyStateListeners();
  }

  /**
   * @brief Update descriptor metadata for an existing logical media session
   *
   * @param sessionId - Stable shared session identifier
   * @param descriptorUpdate - Descriptor fields that should change
   */
  public updateSession(
    sessionId: string,
    descriptorUpdate: MediaSessionDescriptorUpdate,
  ): void {
    const previousSessionSnapshot: MediaSessionSnapshot | undefined =
      this.sessionSnapshotsById.get(sessionId);

    if (previousSessionSnapshot === undefined) {
      return;
    }

    const nextSessionSnapshot: MediaSessionSnapshot = {
      ...previousSessionSnapshot,
      descriptor: {
        ...this.cloneSessionDescriptor(previousSessionSnapshot.descriptor),
        ...this.cloneSessionDescriptorUpdate(descriptorUpdate),
      },
    };

    if (
      this.areSessionSnapshotsEqual(
        previousSessionSnapshot,
        nextSessionSnapshot,
      )
    ) {
      return;
    }

    this.sessionSnapshotsById.set(sessionId, nextSessionSnapshot);
    this.recomputePlan();
    this.notifyStateListeners();
  }

  /**
   * @brief Remove a logical media session from the shared kernel
   *
   * @param sessionId - Stable shared session identifier
   */
  public removeSession(sessionId: string): void {
    if (!this.sessionSnapshotsById.delete(sessionId)) {
      return;
    }

    this.recomputePlan();
    this.notifyStateListeners();
  }

  /**
   * @brief Replace the current shared media intent
   *
   * @param mediaIntent - Latest shared media intent, or `null` to clear it
   */
  public setCurrentIntent(mediaIntent: MediaIntent | null): void {
    if (this.areMediaIntentsEqual(this.currentIntent, mediaIntent)) {
      return;
    }

    this.currentIntent = this.cloneMediaIntent(mediaIntent);
    this.recomputePlan();
    this.notifyStateListeners();
  }

  /**
   * @brief Replace the current planning context in one atomic update
   *
   * @param mediaIntent - Latest shared logical media intent
   * @param focusedItem - Focused browse item when one exists
   * @param selectedItem - Selected browse item when one exists
   * @param activeItem - Active playback item when one exists
   */
  public setPlanningContext<TPreviewMediaItem extends MediaKernelItem>(
    mediaIntent: MediaIntent | null,
    focusedItem: MediaKernelItem | null,
    selectedItem: MediaKernelItem | null,
    activeItem: MediaKernelItem | null,
    previewCandidateInputs: PreviewCandidateInput<TPreviewMediaItem>[] = [],
    planningNowMs: number = Date.now(),
  ): void {
    if (
      this.areMediaIntentsEqual(this.currentIntent, mediaIntent) &&
      this.areMediaItemsEqual(this.focusedItem, focusedItem) &&
      this.areMediaItemsEqual(this.selectedItem, selectedItem) &&
      this.areMediaItemsEqual(this.activeItem, activeItem) &&
      this.arePreviewCandidateInputsEqual(
        this.previewCandidateInputs,
        previewCandidateInputs,
      )
    ) {
      return;
    }

    this.currentIntent = this.cloneMediaIntent(mediaIntent);
    this.focusedItem = focusedItem;
    this.selectedItem = selectedItem;
    this.activeItem = activeItem;
    this.previewCandidateInputs = this.clonePreviewCandidateInputs(
      previewCandidateInputs as PreviewCandidateInput<MediaKernelItem>[],
    );
    this.planningNowMs = planningNowMs;
    this.recomputePlan();
    this.notifyStateListeners();
  }

  /**
   * @brief Mark how warm a logical media session currently is
   *
   * @param sessionId - Stable shared session identifier
   * @param warmth - Latest warm state for the session
   */
  public markSessionWarmth(sessionId: string, warmth: MediaWarmth): void {
    const previousSessionSnapshot: MediaSessionSnapshot | undefined =
      this.sessionSnapshotsById.get(sessionId);

    if (
      previousSessionSnapshot === undefined ||
      previousSessionSnapshot.warmth === warmth
    ) {
      return;
    }

    this.sessionSnapshotsById.set(sessionId, {
      ...previousSessionSnapshot,
      warmth,
    });
    this.notifyStateListeners();
  }

  /**
   * @brief Update the shared lifecycle state for a logical media session
   *
   * @param sessionId - Stable shared session identifier
   * @param state - Latest lifecycle phase
   * @param failureReason - Optional failure detail published with `failed` state
   */
  public setSessionState(
    sessionId: string,
    state: MediaSessionState,
    failureReason: string | null = null,
  ): void {
    const previousSessionSnapshot: MediaSessionSnapshot | undefined =
      this.sessionSnapshotsById.get(sessionId);

    if (
      previousSessionSnapshot === undefined ||
      (previousSessionSnapshot.state === state &&
        previousSessionSnapshot.failureReason === failureReason)
    ) {
      return;
    }

    this.sessionSnapshotsById.set(sessionId, {
      ...previousSessionSnapshot,
      state,
      failureReason,
    });
    this.notifyStateListeners();
  }

  /**
   * @brief Publish an app shell's runtime capability profile
   *
   * @param appId - Stable app shell identifier
   * @param profile - Declarative capability report for the app shell
   */
  public reportAppCapabilities(
    appId: string,
    profile: MediaCapabilityProfile,
  ): void {
    const previousAppMediaCapabilities: AppMediaCapabilities | undefined =
      this.appCapabilitiesById.get(appId);
    const nextAppMediaCapabilities: AppMediaCapabilities = {
      appId,
      profile: this.cloneMediaCapabilityProfile(profile),
    };

    if (
      previousAppMediaCapabilities !== undefined &&
      this.areAppMediaCapabilitiesEqual(
        previousAppMediaCapabilities,
        nextAppMediaCapabilities,
      )
    ) {
      return;
    }

    this.appCapabilitiesById.set(appId, nextAppMediaCapabilities);
    this.recomputePlan();
    this.notifyStateListeners();
  }

  /**
   * @brief Remove a previously reported app capability profile
   *
   * @param appId - Stable app shell identifier
   */
  public removeAppCapabilities(appId: string): void {
    if (!this.appCapabilitiesById.delete(appId)) {
      return;
    }

    this.recomputePlan();
    this.notifyStateListeners();
  }

  /**
   * @brief Release every subscription owned by the media kernel controller
   */
  public destroy(): void {
    this.clearPreviewFarmTimer();
    this.stateListeners.clear();
  }

  /**
   * @brief Notify listeners with the latest immutable media kernel state
   */
  private notifyStateListeners(): void {
    const mediaKernelState: MediaKernelState = this.getState();

    for (const stateListener of this.stateListeners) {
      stateListener(mediaKernelState);
    }
  }

  /**
   * @brief Rebuild the shared plan from the latest immutable controller inputs
   */
  private recomputePlan(): void {
    const nextPlan: MediaPlan = MediaSessionPlanner.createPlan({
      appCapabilityProfile: this.createPlanningCapabilityProfile(),
      currentMediaKernelState: this.getState(),
      mediaIntent: this.currentIntent,
      focusedItem: this.focusedItem,
      selectedItem: this.selectedItem,
      activeItem: this.activeItem,
      previewCandidateInputs: this.clonePreviewCandidateInputs(
        this.previewCandidateInputs,
      ),
      planningNowMs: this.planningNowMs,
      createSourceDescriptor: this.createSourceDescriptor,
    });
    this.syncPreviewFarmTimer(nextPlan.previewFarm);

    if (this.areMediaPlansEqual(this.currentPlan, nextPlan)) {
      return;
    }

    this.currentPlan = nextPlan;
  }

  /**
   * @brief Keep one timer aligned with the next preview-farm TTL transition
   *
   * @param previewFarmState - Latest preview-farm plan state
   */
  private syncPreviewFarmTimer(previewFarmState: PreviewFarmState): void {
    this.clearPreviewFarmTimer();

    if (previewFarmState.nextTransitionAtMs === null) {
      return;
    }

    const delayMs: number = Math.max(
      0,
      previewFarmState.nextTransitionAtMs - Date.now(),
    );

    this.previewFarmTimerId = globalThis.setTimeout((): void => {
      this.previewFarmTimerId = null;
      this.planningNowMs = Date.now();
      this.recomputePlan();
      this.notifyStateListeners();
    }, delayMs);
  }

  /**
   * @brief Cancel any pending preview-farm transition timer
   */
  private clearPreviewFarmTimer(): void {
    if (this.previewFarmTimerId === null) {
      return;
    }

    globalThis.clearTimeout(this.previewFarmTimerId);
    this.previewFarmTimerId = null;
  }

  /**
   * @brief Build one conservative capability profile from current app reports
   *
   * @returns Conservative capability profile, or `null` when no app reported one
   */
  private createPlanningCapabilityProfile(): MediaCapabilityProfile | null {
    const appCapabilities: AppMediaCapabilities[] = [
      ...this.appCapabilitiesById.values(),
    ];

    if (appCapabilities.length === 0) {
      return null;
    }

    return appCapabilities.reduce(
      (
        mergedProfile: MediaCapabilityProfile,
        appMediaCapabilities: AppMediaCapabilities,
      ): MediaCapabilityProfile => ({
        supportsNativePlayback:
          mergedProfile.supportsNativePlayback &&
          appMediaCapabilities.profile.supportsNativePlayback,
        supportsShakaPlayback:
          mergedProfile.supportsShakaPlayback &&
          appMediaCapabilities.profile.supportsShakaPlayback,
        supportsPreviewVideo:
          mergedProfile.supportsPreviewVideo &&
          appMediaCapabilities.profile.supportsPreviewVideo,
        supportsThumbnailExtraction:
          mergedProfile.supportsThumbnailExtraction &&
          appMediaCapabilities.profile.supportsThumbnailExtraction,
        supportsWorkerOffload:
          mergedProfile.supportsWorkerOffload &&
          appMediaCapabilities.profile.supportsWorkerOffload,
        supportsWebGPUPreferred:
          mergedProfile.supportsWebGPUPreferred &&
          appMediaCapabilities.profile.supportsWebGPUPreferred,
        supportsWebGLFallback:
          mergedProfile.supportsWebGLFallback &&
          appMediaCapabilities.profile.supportsWebGLFallback,
        supportsCustomPipeline:
          mergedProfile.supportsCustomPipeline &&
          appMediaCapabilities.profile.supportsCustomPipeline,
        supportsPremiumPlayback:
          mergedProfile.supportsPremiumPlayback &&
          appMediaCapabilities.profile.supportsPremiumPlayback,
        previewSchedulerBudget: {
          maxWarmSessions: Math.min(
            mergedProfile.previewSchedulerBudget.maxWarmSessions,
            appMediaCapabilities.profile.previewSchedulerBudget.maxWarmSessions,
          ),
          maxActivePreviewSessions: Math.min(
            mergedProfile.previewSchedulerBudget.maxActivePreviewSessions,
            appMediaCapabilities.profile.previewSchedulerBudget
              .maxActivePreviewSessions,
          ),
          maxHiddenSessions: Math.min(
            mergedProfile.previewSchedulerBudget.maxHiddenSessions,
            appMediaCapabilities.profile.previewSchedulerBudget
              .maxHiddenSessions,
          ),
          maxPreviewReuseMs: Math.min(
            mergedProfile.previewSchedulerBudget.maxPreviewReuseMs,
            appMediaCapabilities.profile.previewSchedulerBudget
              .maxPreviewReuseMs,
          ),
          maxPreviewOverlapMs: Math.min(
            mergedProfile.previewSchedulerBudget.maxPreviewOverlapMs,
            appMediaCapabilities.profile.previewSchedulerBudget
              .maxPreviewOverlapMs,
          ),
          keepWarmAfterBlurMs: Math.min(
            mergedProfile.previewSchedulerBudget.keepWarmAfterBlurMs,
            appMediaCapabilities.profile.previewSchedulerBudget
              .keepWarmAfterBlurMs,
          ),
        },
      }),
      this.cloneMediaCapabilityProfile(appCapabilities[0].profile),
    );
  }

  /**
   * @brief Clone an app capability report into an immutable snapshot
   *
   * @param appMediaCapabilities - Capability report to clone
   *
   * @returns Cloned capability report
   */
  private cloneAppMediaCapabilities(
    appMediaCapabilities: AppMediaCapabilities,
  ): AppMediaCapabilities {
    return {
      appId: appMediaCapabilities.appId,
      profile: this.cloneMediaCapabilityProfile(appMediaCapabilities.profile),
    };
  }

  /**
   * @brief Clone a declarative runtime capability profile
   *
   * @param profile - Profile to clone
   *
   * @returns Cloned runtime capability profile
   */
  private cloneMediaCapabilityProfile(
    profile: MediaCapabilityProfile,
  ): MediaCapabilityProfile {
    return {
      supportsNativePlayback: profile.supportsNativePlayback,
      supportsShakaPlayback: profile.supportsShakaPlayback,
      supportsPreviewVideo: profile.supportsPreviewVideo,
      supportsThumbnailExtraction: profile.supportsThumbnailExtraction,
      supportsWorkerOffload: profile.supportsWorkerOffload,
      supportsWebGPUPreferred: profile.supportsWebGPUPreferred,
      supportsWebGLFallback: profile.supportsWebGLFallback,
      supportsCustomPipeline: profile.supportsCustomPipeline,
      supportsPremiumPlayback: profile.supportsPremiumPlayback,
      previewSchedulerBudget: {
        maxWarmSessions: profile.previewSchedulerBudget.maxWarmSessions,
        maxActivePreviewSessions:
          profile.previewSchedulerBudget.maxActivePreviewSessions,
        maxHiddenSessions: profile.previewSchedulerBudget.maxHiddenSessions,
        maxPreviewReuseMs: profile.previewSchedulerBudget.maxPreviewReuseMs,
        maxPreviewOverlapMs: profile.previewSchedulerBudget.maxPreviewOverlapMs,
        keepWarmAfterBlurMs: profile.previewSchedulerBudget.keepWarmAfterBlurMs,
      },
    };
  }

  /**
   * @brief Clone a media intent for safe external consumption
   *
   * @param mediaIntent - Intent to clone
   *
   * @returns Cloned media intent, or `null` when none is active
   */
  private cloneMediaIntent(
    mediaIntent: MediaIntent | null,
  ): MediaIntent | null {
    if (mediaIntent === null) {
      return null;
    }

    return {
      targetItemId: mediaIntent.targetItemId,
      type: mediaIntent.type,
    };
  }

  /**
   * @brief Clone the current deterministic plan for safe external consumption
   *
   * @param mediaPlan - Plan to clone
   *
   * @returns Cloned session plan
   */
  private cloneMediaPlan(mediaPlan: MediaPlan): MediaPlan {
    return {
      sessions: mediaPlan.sessions.map(
        (mediaPlanSession: MediaPlanSession): MediaPlanSession =>
          this.cloneMediaPlanSession(mediaPlanSession),
      ),
      previewFarm: this.clonePreviewFarmState(mediaPlan.previewFarm),
    };
  }

  /**
   * @brief Clone one planned session entry
   *
   * @param mediaPlanSession - Planned session to clone
   *
   * @returns Cloned planned session
   */
  private cloneMediaPlanSession(
    mediaPlanSession: MediaPlanSession,
  ): MediaPlanSession {
    return {
      sessionId: mediaPlanSession.sessionId,
      itemId: mediaPlanSession.itemId,
      source: this.cloneMediaSourceDescriptor(mediaPlanSession.source),
      role: mediaPlanSession.role,
      desiredPlaybackLane: mediaPlanSession.desiredPlaybackLane,
      desiredRendererKind: mediaPlanSession.desiredRendererKind,
      desiredWarmth: mediaPlanSession.desiredWarmth,
      priority: mediaPlanSession.priority,
      visibility: mediaPlanSession.visibility,
      reason: this.cloneMediaPlanReason(mediaPlanSession.reason),
    };
  }

  /**
   * @brief Clone one human-readable plan reason
   *
   * @param mediaPlanReason - Plan reason to clone
   *
   * @returns Cloned plan reason
   */
  private cloneMediaPlanReason(
    mediaPlanReason: MediaPlanReason,
  ): MediaPlanReason {
    return {
      intentType: mediaPlanReason.intentType,
      kind: mediaPlanReason.kind,
      message: mediaPlanReason.message,
    };
  }

  /**
   * @brief Clone shared descriptor metadata for a logical media session
   *
   * @param descriptor - Descriptor to clone
   *
   * @returns Cloned session descriptor
   */
  private cloneSessionDescriptor(
    descriptor: MediaSessionDescriptor,
  ): MediaSessionDescriptor {
    return {
      sessionId: descriptor.sessionId,
      role: descriptor.role,
      itemId: descriptor.itemId,
      source: this.cloneMediaSourceDescriptor(descriptor.source),
      playbackLane: descriptor.playbackLane,
      rendererKind: descriptor.rendererKind,
    };
  }

  /**
   * @brief Clone a partial session descriptor update
   *
   * @param descriptorUpdate - Partial descriptor update to clone
   *
   * @returns Cloned session descriptor update
   */
  private cloneSessionDescriptorUpdate(
    descriptorUpdate: MediaSessionDescriptorUpdate,
  ): MediaSessionDescriptorUpdate {
    const clonedDescriptorUpdate: MediaSessionDescriptorUpdate = {};

    if (descriptorUpdate.role !== undefined) {
      clonedDescriptorUpdate.role = descriptorUpdate.role;
    }

    if (descriptorUpdate.itemId !== undefined) {
      clonedDescriptorUpdate.itemId = descriptorUpdate.itemId;
    }

    if (descriptorUpdate.source !== undefined) {
      clonedDescriptorUpdate.source = this.cloneMediaSourceDescriptor(
        descriptorUpdate.source,
      );
    }

    if (descriptorUpdate.playbackLane !== undefined) {
      clonedDescriptorUpdate.playbackLane = descriptorUpdate.playbackLane;
    }

    if (descriptorUpdate.rendererKind !== undefined) {
      clonedDescriptorUpdate.rendererKind = descriptorUpdate.rendererKind;
    }

    return clonedDescriptorUpdate;
  }

  /**
   * @brief Clone a published media session snapshot
   *
   * @param sessionSnapshot - Session snapshot to clone
   *
   * @returns Cloned media session snapshot
   */
  private cloneSessionSnapshot(
    sessionSnapshot: MediaSessionSnapshot,
  ): MediaSessionSnapshot {
    return {
      descriptor: this.cloneSessionDescriptor(sessionSnapshot.descriptor),
      state: sessionSnapshot.state,
      warmth: sessionSnapshot.warmth,
      failureReason: sessionSnapshot.failureReason,
    };
  }

  /**
   * @brief Clone shared source metadata
   *
   * @param source - Source descriptor to clone
   *
   * @returns Cloned source descriptor, or `null` when absent
   */
  private cloneMediaSourceDescriptor(
    source: MediaSourceDescriptor | null,
  ): MediaSourceDescriptor | null {
    if (source === null) {
      return null;
    }

    return {
      sourceId: source.sourceId,
      kind: source.kind,
      url: source.url,
      mimeType: source.mimeType,
      posterUrl: source.posterUrl,
    };
  }

  /**
   * @brief Clone preview-farm state for safe external consumption
   *
   * @param previewFarmState - Preview-farm state to clone
   *
   * @returns Cloned preview-farm state
   */
  private clonePreviewFarmState(
    previewFarmState: PreviewFarmState,
  ): PreviewFarmState {
    return {
      budget: {
        maxWarmSessions: previewFarmState.budget.maxWarmSessions,
        maxActivePreviewSessions:
          previewFarmState.budget.maxActivePreviewSessions,
        maxHiddenSessions: previewFarmState.budget.maxHiddenSessions,
        maxPreviewReuseMs: previewFarmState.budget.maxPreviewReuseMs,
        maxPreviewOverlapMs: previewFarmState.budget.maxPreviewOverlapMs,
        keepWarmAfterBlurMs: previewFarmState.budget.keepWarmAfterBlurMs,
      },
      candidates: previewFarmState.candidates.map((previewCandidate) => ({
        candidateId: previewCandidate.candidateId,
        sessionId: previewCandidate.sessionId,
        itemId: previewCandidate.itemId,
        source: {
          sourceId: previewCandidate.source.sourceId,
          kind: previewCandidate.source.kind,
          url: previewCandidate.source.url,
          mimeType: previewCandidate.source.mimeType,
          posterUrl: previewCandidate.source.posterUrl,
        },
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
      })),
      decisions: previewFarmState.decisions.map((previewSchedulerDecision) => ({
        candidateId: previewSchedulerDecision.candidateId,
        sessionId: previewSchedulerDecision.sessionId,
        itemId: previewSchedulerDecision.itemId,
        score: {
          reason: previewSchedulerDecision.score.reason,
          baseValue: previewSchedulerDecision.score.baseValue,
          reuseBonus: previewSchedulerDecision.score.reuseBonus,
          totalValue: previewSchedulerDecision.score.totalValue,
        },
        primaryReason: previewSchedulerDecision.primaryReason,
        deferredReason: previewSchedulerDecision.deferredReason,
        evictionReason: previewSchedulerDecision.evictionReason,
        targetWarmState: previewSchedulerDecision.targetWarmState,
        shouldWarm: previewSchedulerDecision.shouldWarm,
        shouldActivate: previewSchedulerDecision.shouldActivate,
        shouldRetain: previewSchedulerDecision.shouldRetain,
        shouldEvict: previewSchedulerDecision.shouldEvict,
        isDeferred: previewSchedulerDecision.isDeferred,
        retainUntilMs: previewSchedulerDecision.retainUntilMs,
      })),
      sessionAssignments: previewFarmState.sessionAssignments.map(
        (previewSessionAssignment) => ({
          sessionId: previewSessionAssignment.sessionId,
          itemId: previewSessionAssignment.itemId,
          slotId: previewSessionAssignment.slotId,
          warmState: previewSessionAssignment.warmState,
          isActive: previewSessionAssignment.isActive,
        }),
      ),
      activeSessionIds: [...previewFarmState.activeSessionIds],
      warmedSessionIds: [...previewFarmState.warmedSessionIds],
      retainedSessionIds: [...previewFarmState.retainedSessionIds],
      evictedSessionIds: [...previewFarmState.evictedSessionIds],
      deferredSessionIds: [...previewFarmState.deferredSessionIds],
      nextTransitionAtMs: previewFarmState.nextTransitionAtMs,
    };
  }

  /**
   * @brief Clone preview candidate inputs captured from the browse bridge
   *
   * @param previewCandidateInputs - Preview inputs to clone
   *
   * @returns Cloned preview candidate inputs
   */
  private clonePreviewCandidateInputs(
    previewCandidateInputs: PreviewCandidateInput<MediaKernelItem>[],
  ): PreviewCandidateInput<MediaKernelItem>[] {
    return previewCandidateInputs.map(
      (
        previewCandidateInput: PreviewCandidateInput<MediaKernelItem>,
      ): PreviewCandidateInput<MediaKernelItem> => ({
        mediaItem: previewCandidateInput.mediaItem,
        rowIndex: previewCandidateInput.rowIndex,
        itemIndex: previewCandidateInput.itemIndex,
        reason: previewCandidateInput.reason,
        focusStartedAtMs: previewCandidateInput.focusStartedAtMs,
        lastFocusedAtMs: previewCandidateInput.lastFocusedAtMs,
      }),
    );
  }

  /**
   * @brief Build an empty preview-farm state for startup and unsupported flows
   *
   * @returns Empty preview-farm state
   */
  private createEmptyPreviewFarmState(): PreviewFarmState {
    return {
      budget: {
        maxWarmSessions: PreviewScheduler.UNSUPPORTED_BUDGET.maxWarmSessions,
        maxActivePreviewSessions:
          PreviewScheduler.UNSUPPORTED_BUDGET.maxActivePreviewSessions,
        maxHiddenSessions:
          PreviewScheduler.UNSUPPORTED_BUDGET.maxHiddenSessions,
        maxPreviewReuseMs:
          PreviewScheduler.UNSUPPORTED_BUDGET.maxPreviewReuseMs,
        maxPreviewOverlapMs:
          PreviewScheduler.UNSUPPORTED_BUDGET.maxPreviewOverlapMs,
        keepWarmAfterBlurMs:
          PreviewScheduler.UNSUPPORTED_BUDGET.keepWarmAfterBlurMs,
      },
      candidates: [],
      decisions: [],
      sessionAssignments: [],
      activeSessionIds: [],
      warmedSessionIds: [],
      retainedSessionIds: [],
      evictedSessionIds: [],
      deferredSessionIds: [],
      nextTransitionAtMs: null,
    };
  }

  /**
   * @brief Compare two app capability reports for semantic equality
   *
   * @param leftAppMediaCapabilities - First app capability report
   * @param rightAppMediaCapabilities - Second app capability report
   *
   * @returns `true` when both reports describe the same capabilities
   */
  private areAppMediaCapabilitiesEqual(
    leftAppMediaCapabilities: AppMediaCapabilities,
    rightAppMediaCapabilities: AppMediaCapabilities,
  ): boolean {
    const leftProfile: MediaCapabilityProfile =
      leftAppMediaCapabilities.profile;
    const rightProfile: MediaCapabilityProfile =
      rightAppMediaCapabilities.profile;

    return (
      leftAppMediaCapabilities.appId === rightAppMediaCapabilities.appId &&
      leftProfile.supportsNativePlayback ===
        rightProfile.supportsNativePlayback &&
      leftProfile.supportsShakaPlayback ===
        rightProfile.supportsShakaPlayback &&
      leftProfile.supportsPreviewVideo === rightProfile.supportsPreviewVideo &&
      leftProfile.supportsThumbnailExtraction ===
        rightProfile.supportsThumbnailExtraction &&
      leftProfile.supportsWorkerOffload ===
        rightProfile.supportsWorkerOffload &&
      leftProfile.supportsWebGPUPreferred ===
        rightProfile.supportsWebGPUPreferred &&
      leftProfile.supportsWebGLFallback ===
        rightProfile.supportsWebGLFallback &&
      leftProfile.supportsCustomPipeline ===
        rightProfile.supportsCustomPipeline &&
      leftProfile.supportsPremiumPlayback ===
        rightProfile.supportsPremiumPlayback &&
      leftProfile.previewSchedulerBudget.maxWarmSessions ===
        rightProfile.previewSchedulerBudget.maxWarmSessions &&
      leftProfile.previewSchedulerBudget.maxActivePreviewSessions ===
        rightProfile.previewSchedulerBudget.maxActivePreviewSessions &&
      leftProfile.previewSchedulerBudget.maxHiddenSessions ===
        rightProfile.previewSchedulerBudget.maxHiddenSessions &&
      leftProfile.previewSchedulerBudget.maxPreviewReuseMs ===
        rightProfile.previewSchedulerBudget.maxPreviewReuseMs &&
      leftProfile.previewSchedulerBudget.maxPreviewOverlapMs ===
        rightProfile.previewSchedulerBudget.maxPreviewOverlapMs &&
      leftProfile.previewSchedulerBudget.keepWarmAfterBlurMs ===
        rightProfile.previewSchedulerBudget.keepWarmAfterBlurMs
    );
  }

  /**
   * @brief Compare two media intents for semantic equality
   *
   * @param leftMediaIntent - First intent
   * @param rightMediaIntent - Second intent
   *
   * @returns `true` when both intents describe the same orchestration target
   */
  private areMediaIntentsEqual(
    leftMediaIntent: MediaIntent | null,
    rightMediaIntent: MediaIntent | null,
  ): boolean {
    if (leftMediaIntent === rightMediaIntent) {
      return true;
    }

    if (leftMediaIntent === null || rightMediaIntent === null) {
      return false;
    }

    return (
      leftMediaIntent.targetItemId === rightMediaIntent.targetItemId &&
      leftMediaIntent.type === rightMediaIntent.type
    );
  }

  /**
   * @brief Compare two media items for semantic planning equality
   *
   * @param leftMediaItem - First media item
   * @param rightMediaItem - Second media item
   *
   * @returns `true` when both item references represent the same shared item
   */
  private areMediaItemsEqual(
    leftMediaItem: MediaKernelItem | null,
    rightMediaItem: MediaKernelItem | null,
  ): boolean {
    return leftMediaItem?.id === rightMediaItem?.id;
  }

  /**
   * @brief Compare two media plans for semantic equality
   *
   * @param leftMediaPlan - First plan snapshot
   * @param rightMediaPlan - Second plan snapshot
   *
   * @returns `true` when both plans describe the same planned sessions
   */
  private areMediaPlansEqual(
    leftMediaPlan: MediaPlan,
    rightMediaPlan: MediaPlan,
  ): boolean {
    if (
      leftMediaPlan.sessions.length !== rightMediaPlan.sessions.length ||
      !this.arePreviewFarmsEqual(
        leftMediaPlan.previewFarm,
        rightMediaPlan.previewFarm,
      )
    ) {
      return false;
    }

    return leftMediaPlan.sessions.every(
      (leftPlannedSession: MediaPlanSession, sessionIndex: number): boolean =>
        this.areMediaPlanSessionsEqual(
          leftPlannedSession,
          rightMediaPlan.sessions[sessionIndex],
        ),
    );
  }

  /**
   * @brief Compare two planned sessions for semantic equality
   *
   * @param leftPlannedSession - First planned session
   * @param rightPlannedSession - Second planned session
   *
   * @returns `true` when both planned sessions match
   */
  private areMediaPlanSessionsEqual(
    leftPlannedSession: MediaPlanSession,
    rightPlannedSession: MediaPlanSession | undefined,
  ): boolean {
    if (rightPlannedSession === undefined) {
      return false;
    }

    return (
      leftPlannedSession.sessionId === rightPlannedSession.sessionId &&
      leftPlannedSession.itemId === rightPlannedSession.itemId &&
      leftPlannedSession.role === rightPlannedSession.role &&
      leftPlannedSession.desiredPlaybackLane ===
        rightPlannedSession.desiredPlaybackLane &&
      leftPlannedSession.desiredRendererKind ===
        rightPlannedSession.desiredRendererKind &&
      leftPlannedSession.desiredWarmth === rightPlannedSession.desiredWarmth &&
      leftPlannedSession.priority === rightPlannedSession.priority &&
      leftPlannedSession.visibility === rightPlannedSession.visibility &&
      this.areMediaPlanReasonsEqual(
        leftPlannedSession.reason,
        rightPlannedSession.reason,
      ) &&
      this.areMediaSourceDescriptorsEqual(
        leftPlannedSession.source,
        rightPlannedSession.source,
      )
    );
  }

  /**
   * @brief Compare two human-readable plan reasons for semantic equality
   *
   * @param leftMediaPlanReason - First plan reason
   * @param rightMediaPlanReason - Second plan reason
   *
   * @returns `true` when both plan reasons match
   */
  private areMediaPlanReasonsEqual(
    leftMediaPlanReason: MediaPlanReason,
    rightMediaPlanReason: MediaPlanReason,
  ): boolean {
    return (
      leftMediaPlanReason.intentType === rightMediaPlanReason.intentType &&
      leftMediaPlanReason.kind === rightMediaPlanReason.kind &&
      leftMediaPlanReason.message === rightMediaPlanReason.message
    );
  }

  /**
   * @brief Compare two media source descriptors for semantic equality
   *
   * @param leftSource - First source descriptor
   * @param rightSource - Second source descriptor
   *
   * @returns `true` when both source descriptors match
   */
  private areMediaSourceDescriptorsEqual(
    leftSource: MediaSourceDescriptor | null,
    rightSource: MediaSourceDescriptor | null,
  ): boolean {
    if (leftSource === rightSource) {
      return true;
    }

    if (leftSource === null || rightSource === null) {
      return false;
    }

    return (
      leftSource.sourceId === rightSource.sourceId &&
      leftSource.kind === rightSource.kind &&
      leftSource.url === rightSource.url &&
      leftSource.mimeType === rightSource.mimeType &&
      leftSource.posterUrl === rightSource.posterUrl
    );
  }

  /**
   * @brief Compare two session snapshots for semantic equality
   *
   * @param leftSessionSnapshot - First session snapshot
   * @param rightSessionSnapshot - Second session snapshot
   *
   * @returns `true` when both session snapshots match
   */
  private areSessionSnapshotsEqual(
    leftSessionSnapshot: MediaSessionSnapshot,
    rightSessionSnapshot: MediaSessionSnapshot,
  ): boolean {
    const leftDescriptor: MediaSessionDescriptor =
      leftSessionSnapshot.descriptor;
    const rightDescriptor: MediaSessionDescriptor =
      rightSessionSnapshot.descriptor;

    return (
      leftDescriptor.sessionId === rightDescriptor.sessionId &&
      leftDescriptor.role === rightDescriptor.role &&
      leftDescriptor.itemId === rightDescriptor.itemId &&
      leftDescriptor.playbackLane === rightDescriptor.playbackLane &&
      leftDescriptor.rendererKind === rightDescriptor.rendererKind &&
      leftSessionSnapshot.state === rightSessionSnapshot.state &&
      leftSessionSnapshot.warmth === rightSessionSnapshot.warmth &&
      leftSessionSnapshot.failureReason ===
        rightSessionSnapshot.failureReason &&
      this.areMediaSourceDescriptorsEqual(
        leftDescriptor.source,
        rightDescriptor.source,
      )
    );
  }

  /**
   * @brief Compare two preview-farm states for semantic equality
   *
   * @param leftPreviewFarmState - First preview-farm state
   * @param rightPreviewFarmState - Second preview-farm state
   *
   * @returns `true` when both preview-farm states match
   */
  private arePreviewFarmsEqual(
    leftPreviewFarmState: PreviewFarmState,
    rightPreviewFarmState: PreviewFarmState,
  ): boolean {
    return (
      JSON.stringify(leftPreviewFarmState) ===
      JSON.stringify(rightPreviewFarmState)
    );
  }

  /**
   * @brief Compare two preview candidate input arrays for planning equality
   *
   * @param leftPreviewCandidateInputs - First preview candidate array
   * @param rightPreviewCandidateInputs - Second preview candidate array
   *
   * @returns `true` when both arrays describe the same preview candidates
   */
  private arePreviewCandidateInputsEqual(
    leftPreviewCandidateInputs: PreviewCandidateInput<MediaKernelItem>[],
    rightPreviewCandidateInputs: PreviewCandidateInput<MediaKernelItem>[],
  ): boolean {
    if (
      leftPreviewCandidateInputs.length !== rightPreviewCandidateInputs.length
    ) {
      return false;
    }

    return leftPreviewCandidateInputs.every(
      (
        leftPreviewCandidateInput: PreviewCandidateInput<MediaKernelItem>,
        previewCandidateIndex: number,
      ): boolean => {
        const rightPreviewCandidateInput:
          | PreviewCandidateInput<MediaKernelItem>
          | undefined = rightPreviewCandidateInputs[previewCandidateIndex];

        if (rightPreviewCandidateInput === undefined) {
          return false;
        }

        return (
          leftPreviewCandidateInput.mediaItem.id ===
            rightPreviewCandidateInput.mediaItem.id &&
          leftPreviewCandidateInput.rowIndex ===
            rightPreviewCandidateInput.rowIndex &&
          leftPreviewCandidateInput.itemIndex ===
            rightPreviewCandidateInput.itemIndex &&
          leftPreviewCandidateInput.reason ===
            rightPreviewCandidateInput.reason &&
          leftPreviewCandidateInput.focusStartedAtMs ===
            rightPreviewCandidateInput.focusStartedAtMs &&
          leftPreviewCandidateInput.lastFocusedAtMs ===
            rightPreviewCandidateInput.lastFocusedAtMs
        );
      },
    );
  }
}
