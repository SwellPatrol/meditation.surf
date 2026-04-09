/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { AppMediaCapabilities } from "./AppMediaCapabilities";
import type { MediaCapabilityProfile } from "./MediaCapabilityProfile";
import type { MediaIntent } from "./MediaIntent";
import type { MediaKernelState } from "./MediaKernelState";
import type { MediaSessionDescriptor } from "./MediaSessionDescriptor";
import type { MediaSessionSnapshot } from "./MediaSessionSnapshot";
import type { MediaSessionState } from "./MediaSessionState";
import type { MediaSourceDescriptor } from "./MediaSourceDescriptor";
import type { MediaWarmth } from "./MediaWarmth";

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
 * The controller tracks logical sessions, app capability reports, and the
 * current media intent so future runtime-specific playback pipelines can share
 * one source of truth without centralizing rendering behavior here.
 */
export class MediaKernelController {
  private readonly appCapabilitiesById: Map<string, AppMediaCapabilities>;
  private readonly sessionSnapshotsById: Map<string, MediaSessionSnapshot>;
  private readonly stateListeners: Set<MediaKernelStateListener>;

  private currentIntent: MediaIntent | null;

  /**
   * @brief Create a runtime-agnostic media kernel controller
   */
  public constructor() {
    this.appCapabilitiesById = new Map<string, AppMediaCapabilities>();
    this.sessionSnapshotsById = new Map<string, MediaSessionSnapshot>();
    this.stateListeners = new Set<MediaKernelStateListener>();
    this.currentIntent = null;
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
      appCapabilities,
      currentIntent: this.cloneMediaIntent(this.currentIntent),
      sessions,
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

    this.notifyStateListeners();
  }

  /**
   * @brief Release every subscription owned by the media kernel controller
   */
  public destroy(): void {
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
      itemId: mediaIntent.itemId,
      role: mediaIntent.role,
      source: this.cloneMediaSourceDescriptor(mediaIntent.source),
      preferredPlaybackLane: mediaIntent.preferredPlaybackLane,
      preferredRendererKind: mediaIntent.preferredRendererKind,
      targetWarmth: mediaIntent.targetWarmth,
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
      kind: source.kind,
      url: source.url,
      mimeType: source.mimeType,
      posterUrl: source.posterUrl,
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
        rightProfile.supportsPremiumPlayback
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
      leftMediaIntent.itemId === rightMediaIntent.itemId &&
      leftMediaIntent.role === rightMediaIntent.role &&
      leftMediaIntent.preferredPlaybackLane ===
        rightMediaIntent.preferredPlaybackLane &&
      leftMediaIntent.preferredRendererKind ===
        rightMediaIntent.preferredRendererKind &&
      leftMediaIntent.targetWarmth === rightMediaIntent.targetWarmth &&
      this.areMediaSourceDescriptorsEqual(
        leftMediaIntent.source,
        rightMediaIntent.source,
      )
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
}
