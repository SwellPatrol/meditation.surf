/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  DEFAULT_CACHE_POLICY,
  type DerivedArtifactDescriptor,
  type DerivedArtifactEntry,
  type DerivedArtifactResult,
  VfsController,
} from "@meditation-surf/vfs";

import type { AudioPolicyDecision } from "../audio/AudioPolicyDecision";
import type { MediaThumbnailCacheEntry } from "./MediaThumbnailCacheEntry";
import type { MediaThumbnailDescriptor } from "./MediaThumbnailDescriptor";
import type {
  MediaThumbnailPriority,
  MediaThumbnailQuality,
} from "./MediaThumbnailExtractionPolicy";
import type { MediaThumbnailExtractionResult } from "./MediaThumbnailExtractionResult";
import type { MediaThumbnailRequest } from "./MediaThumbnailRequest";
import type { MediaThumbnailResult } from "./MediaThumbnailResult";
import type { MediaThumbnailRuntimeAdapter } from "./MediaThumbnailRuntimeAdapter";
import type { MediaThumbnailRuntimeCapabilities } from "./MediaThumbnailRuntimeCapabilities";
import type { MediaThumbnailSnapshot } from "./MediaThumbnailSnapshot";
import type { MediaThumbnailState } from "./MediaThumbnailState";

/**
 * @brief Listener signature used by the shared thumbnail controller
 */
export type MediaThumbnailSnapshotListener = (
  snapshot: MediaThumbnailSnapshot,
) => void;

/**
 * @brief Shared thumbnail orchestration controller
 *
 * The controller stays runtime-agnostic. It owns request deduplication,
 * conservative in-memory caching, pending work prioritization, and immutable
 * debug snapshots while leaving actual media extraction to app-shell adapters.
 */
export class MediaThumbnailController {
  private readonly cacheEntriesBySourceId: Map<
    string,
    MediaThumbnailCacheEntry
  >;
  private readonly listeners: Set<MediaThumbnailSnapshotListener>;
  private readonly pendingSourceIds: Set<string>;
  private readonly vfsController: VfsController;

  private isProcessingQueue: boolean;
  private runtimeAdapter: MediaThumbnailRuntimeAdapter | null;

  /**
   * @brief Create the shared thumbnail controller
   *
   * @param runtimeAdapter - Optional app-shell runtime adapter
   * @param vfsController - Optional VFS controller that owns artifact storage
   */
  public constructor(
    runtimeAdapter: MediaThumbnailRuntimeAdapter | null = null,
    vfsController: VfsController = new VfsController(),
  ) {
    this.cacheEntriesBySourceId = new Map<string, MediaThumbnailCacheEntry>();
    this.listeners = new Set<MediaThumbnailSnapshotListener>();
    this.pendingSourceIds = new Set<string>();
    this.vfsController = vfsController;
    this.isProcessingQueue = false;
    this.runtimeAdapter = runtimeAdapter;
  }

  /**
   * @brief Return the runtime adapter currently registered for extraction work
   *
   * @returns Runtime adapter, or `null` when none is registered
   */
  public getRuntimeAdapter(): MediaThumbnailRuntimeAdapter | null {
    return this.runtimeAdapter;
  }

  /**
   * @brief Return the current runtime thumbnail capabilities
   *
   * @returns Runtime capability snapshot, or `null` when no adapter is present
   */
  public getRuntimeCapabilities(): MediaThumbnailRuntimeCapabilities | null {
    return this.runtimeAdapter?.getCapabilities() ?? null;
  }

  /**
   * @brief Return the shared VFS controller that owns thumbnail artifact storage
   *
   * @returns Shared VFS controller
   */
  public getVfsController(): VfsController {
    return this.vfsController;
  }

  /**
   * @brief Replace the runtime adapter used for thumbnail extraction
   *
   * @param runtimeAdapter - Runtime adapter implemented by the current app shell
   */
  public setRuntimeAdapter(
    runtimeAdapter: MediaThumbnailRuntimeAdapter | null,
  ): void {
    if (this.runtimeAdapter === runtimeAdapter) {
      return;
    }

    this.runtimeAdapter = runtimeAdapter;
    this.syncUnsupportedEntries();
    this.queueProcessing();
  }

  /**
   * @brief Return the current immutable thumbnail snapshot
   *
   * @returns Shared thumbnail cache and request snapshot
   */
  public getState(): MediaThumbnailSnapshot {
    const sortedEntries: MediaThumbnailCacheEntry[] = [
      ...this.cacheEntriesBySourceId.values(),
    ]
      .sort(
        (
          leftEntry: MediaThumbnailCacheEntry,
          rightEntry: MediaThumbnailCacheEntry,
        ): number =>
          leftEntry.descriptor.sourceId.localeCompare(
            rightEntry.descriptor.sourceId,
          ),
      )
      .map(
        (cacheEntry: MediaThumbnailCacheEntry): MediaThumbnailCacheEntry =>
          this.cloneCacheEntry(cacheEntry),
      );

    return {
      entries: sortedEntries,
      requestedSourceIds: sortedEntries
        .filter(
          (cacheEntry: MediaThumbnailCacheEntry): boolean =>
            cacheEntry.isRelevant,
        )
        .map(
          (cacheEntry: MediaThumbnailCacheEntry): string =>
            cacheEntry.descriptor.sourceId,
        ),
      cachedSourceIds: sortedEntries
        .filter(
          (cacheEntry: MediaThumbnailCacheEntry): boolean =>
            cacheEntry.result !== null,
        )
        .map(
          (cacheEntry: MediaThumbnailCacheEntry): string =>
            cacheEntry.descriptor.sourceId,
        ),
      readySourceIds: sortedEntries
        .filter(
          (cacheEntry: MediaThumbnailCacheEntry): boolean =>
            cacheEntry.state === "ready",
        )
        .map(
          (cacheEntry: MediaThumbnailCacheEntry): string =>
            cacheEntry.descriptor.sourceId,
        ),
      failedSourceIds: sortedEntries
        .filter(
          (cacheEntry: MediaThumbnailCacheEntry): boolean =>
            cacheEntry.state === "failed",
        )
        .map(
          (cacheEntry: MediaThumbnailCacheEntry): string =>
            cacheEntry.descriptor.sourceId,
        ),
      unsupportedSourceIds: sortedEntries
        .filter(
          (cacheEntry: MediaThumbnailCacheEntry): boolean =>
            cacheEntry.state === "unsupported",
        )
        .map(
          (cacheEntry: MediaThumbnailCacheEntry): string =>
            cacheEntry.descriptor.sourceId,
        ),
    };
  }

  /**
   * @brief Resolve the current cache entry associated with one item identifier
   *
   * @param itemId - Stable media item identifier
   *
   * @returns Matching cache entry, or `null` when none exists
   */
  public getEntryForItemId(itemId: string): MediaThumbnailCacheEntry | null {
    for (const cacheEntry of this.cacheEntriesBySourceId.values()) {
      if (cacheEntry.descriptor.itemIds.includes(itemId)) {
        return this.cloneCacheEntry(cacheEntry);
      }
    }

    return null;
  }

  /**
   * @brief Resolve the current cache entry associated with one source identifier
   *
   * @param sourceId - Stable media source identifier
   *
   * @returns Matching cache entry, or `null` when none exists
   */
  public getEntryForSourceId(
    sourceId: string,
  ): MediaThumbnailCacheEntry | null {
    const cacheEntry: MediaThumbnailCacheEntry | undefined =
      this.cacheEntriesBySourceId.get(sourceId);

    return cacheEntry === undefined ? null : this.cloneCacheEntry(cacheEntry);
  }

  /**
   * @brief Replace the current relevant thumbnail request set
   *
   * @param requests - Bounded request set derived from current browse context
   */
  public setRequests(requests: readonly MediaThumbnailRequest[]): void {
    const nextRelevantSourceIds: Set<string> = new Set<string>();

    for (const request of requests) {
      const normalizedRequest: MediaThumbnailRequest =
        this.cloneRequest(request);
      const sourceId: string = normalizedRequest.sourceId;
      const nowMs: number = Date.now();
      const existingEntry: MediaThumbnailCacheEntry | undefined =
        this.cacheEntriesBySourceId.get(sourceId);
      const nextDescriptor: MediaThumbnailDescriptor = this.cloneDescriptor(
        normalizedRequest.descriptor,
      );
      const nextState: MediaThumbnailState =
        existingEntry?.state === "ready" ? "ready" : "requested";

      nextRelevantSourceIds.add(sourceId);
      this.cacheEntriesBySourceId.set(sourceId, {
        descriptor: nextDescriptor,
        state: nextState,
        request: normalizedRequest,
        result: existingEntry?.result ?? null,
        failureReason:
          nextState === "ready" ? null : (existingEntry?.failureReason ?? null),
        isRelevant: true,
        lastRequestedAt: nowMs,
        lastUpdatedAt: nowMs,
      });

      if (existingEntry?.state !== "ready") {
        this.pendingSourceIds.add(sourceId);
      }
    }

    for (const [
      sourceId,
      cacheEntry,
    ] of this.cacheEntriesBySourceId.entries()) {
      if (nextRelevantSourceIds.has(sourceId)) {
        continue;
      }

      this.cacheEntriesBySourceId.set(sourceId, {
        ...this.cloneCacheEntry(cacheEntry),
        isRelevant: false,
      });
    }

    this.syncUnsupportedEntries();
    this.notifyListeners();
    this.queueProcessing();
  }

  /**
   * @brief Invalidate one cached thumbnail source
   *
   * @param sourceId - Stable media source identifier to discard
   *
   * @returns Optional async cleanup promise
   */
  public async invalidateSource(sourceId: string): Promise<void> {
    const cacheEntry: MediaThumbnailCacheEntry | undefined =
      this.cacheEntriesBySourceId.get(sourceId);

    if (cacheEntry === undefined) {
      return;
    }

    this.pendingSourceIds.delete(sourceId);
    this.cacheEntriesBySourceId.delete(sourceId);
    await this.releaseCachedResult(cacheEntry.result);
    this.notifyListeners();
  }

  /**
   * @brief Invalidate every cached thumbnail entry
   *
   * @returns Optional async cleanup promise
   */
  public async invalidateAll(): Promise<void> {
    const cacheEntries: MediaThumbnailCacheEntry[] = [
      ...this.cacheEntriesBySourceId.values(),
    ];

    this.pendingSourceIds.clear();
    this.cacheEntriesBySourceId.clear();

    for (const cacheEntry of cacheEntries) {
      await this.releaseCachedResult(cacheEntry.result);
    }

    this.notifyListeners();
  }

  /**
   * @brief Subscribe to thumbnail snapshot changes
   *
   * @param listener - Callback notified whenever the thumbnail snapshot changes
   *
   * @returns Cleanup callback that removes the listener
   */
  public subscribe(listener: MediaThumbnailSnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /**
   * @brief Release cached thumbnails and clear subscriptions
   */
  public destroy(): void {
    void this.invalidateAll();
    this.vfsController.destroy();
    this.listeners.clear();
  }

  /**
   * @brief Schedule queue processing without running overlapping extractions
   */
  private queueProcessing(): void {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    void this.processQueue().finally((): void => {
      this.isProcessingQueue = false;

      if (this.hasPendingWork()) {
        this.queueProcessing();
      }
    });
  }

  /**
   * @brief Execute pending extractions in deterministic priority order
   */
  private async processQueue(): Promise<void> {
    while (true) {
      const nextSourceId: string | null = this.selectNextPendingSourceId();

      if (nextSourceId === null) {
        return;
      }

      const cacheEntry: MediaThumbnailCacheEntry | undefined =
        this.cacheEntriesBySourceId.get(nextSourceId);

      if (cacheEntry === undefined || cacheEntry.request === null) {
        this.pendingSourceIds.delete(nextSourceId);
        continue;
      }

      if (cacheEntry.state === "ready") {
        this.pendingSourceIds.delete(nextSourceId);
        continue;
      }

      const restoredThumbnailResult: MediaThumbnailResult | null =
        cacheEntry.request === null
          ? null
          : await this.tryRestoreCachedThumbnailResult(cacheEntry.request);

      if (restoredThumbnailResult !== null) {
        this.pendingSourceIds.delete(nextSourceId);
        this.updateCacheEntryState(
          nextSourceId,
          "ready",
          null,
          restoredThumbnailResult,
        );
        continue;
      }

      if (!this.isRequestSupported(cacheEntry.request)) {
        this.pendingSourceIds.delete(nextSourceId);
        this.updateCacheEntryState(
          nextSourceId,
          "unsupported",
          this.createUnsupportedReason(cacheEntry.request),
          cacheEntry.result,
        );
        continue;
      }

      this.updateCacheEntryState(
        nextSourceId,
        "loading",
        null,
        cacheEntry.result,
      );
      this.updateCacheEntryState(
        nextSourceId,
        "extracting",
        null,
        cacheEntry.result,
      );

      try {
        const runtimeAdapter: MediaThumbnailRuntimeAdapter =
          this.requireRuntimeAdapter();
        const thumbnailExtractionResult: MediaThumbnailExtractionResult =
          await runtimeAdapter.extractThumbnail(cacheEntry.request);
        const thumbnailResult: MediaThumbnailResult =
          await this.persistThumbnailResult(
            cacheEntry.request,
            thumbnailExtractionResult,
          );

        this.pendingSourceIds.delete(nextSourceId);
        this.updateCacheEntryState(
          nextSourceId,
          "ready",
          null,
          thumbnailResult,
        );
      } catch (error: unknown) {
        const failureReason: string =
          error instanceof Error && error.message.length > 0
            ? error.message
            : `Thumbnail extraction failed for ${nextSourceId}.`;

        this.pendingSourceIds.delete(nextSourceId);
        this.updateCacheEntryState(nextSourceId, "failed", failureReason, null);
      }
    }
  }

  /**
   * @brief Mark requested entries unsupported when the runtime cannot extract them
   */
  private syncUnsupportedEntries(): void {
    for (const [
      sourceId,
      cacheEntry,
    ] of this.cacheEntriesBySourceId.entries()) {
      if (cacheEntry.request === null) {
        continue;
      }

      if (cacheEntry.state === "ready") {
        continue;
      }

      if (this.isRequestSupported(cacheEntry.request)) {
        if (cacheEntry.state === "unsupported") {
          this.updateCacheEntryState(
            sourceId,
            "requested",
            null,
            cacheEntry.result,
          );
          this.pendingSourceIds.add(sourceId);
        }

        continue;
      }

      this.pendingSourceIds.delete(sourceId);
      this.updateCacheEntryState(
        sourceId,
        "unsupported",
        this.createUnsupportedReason(cacheEntry.request),
        cacheEntry.result,
      );
    }
  }

  /**
   * @brief Determine whether any source still needs processing
   *
   * @returns `true` when the queue still contains pending sources
   */
  private hasPendingWork(): boolean {
    return this.selectNextPendingSourceId() !== null;
  }

  /**
   * @brief Pick the next queued source using stable priority ordering
   *
   * @returns Highest-priority queued source identifier, or `null`
   */
  private selectNextPendingSourceId(): string | null {
    const pendingEntries: MediaThumbnailCacheEntry[] = [
      ...this.pendingSourceIds.values(),
    ]
      .map(
        (sourceId: string): MediaThumbnailCacheEntry | null =>
          this.cacheEntriesBySourceId.get(sourceId) ?? null,
      )
      .filter(
        (
          cacheEntry: MediaThumbnailCacheEntry | null,
        ): cacheEntry is MediaThumbnailCacheEntry =>
          cacheEntry !== null &&
          cacheEntry.request !== null &&
          cacheEntry.state !== "ready" &&
          cacheEntry.state !== "unsupported",
      )
      .sort(
        (
          leftEntry: MediaThumbnailCacheEntry,
          rightEntry: MediaThumbnailCacheEntry,
        ): number => this.comparePendingEntries(leftEntry, rightEntry),
      );

    return pendingEntries[0]?.descriptor.sourceId ?? null;
  }

  /**
   * @brief Compare two queued entries for deterministic extraction ordering
   *
   * @param leftEntry - First pending entry being compared
   * @param rightEntry - Second pending entry being compared
   *
   * @returns Sort order that favors higher priority and older requests
   */
  private comparePendingEntries(
    leftEntry: MediaThumbnailCacheEntry,
    rightEntry: MediaThumbnailCacheEntry,
  ): number {
    const leftPriorityRank: number = this.getPriorityRank(
      leftEntry.request?.priorityHint ?? "none",
    );
    const rightPriorityRank: number = this.getPriorityRank(
      rightEntry.request?.priorityHint ?? "none",
    );

    if (leftPriorityRank !== rightPriorityRank) {
      return rightPriorityRank - leftPriorityRank;
    }

    const leftQualityRank: number = this.getQualityRank(
      leftEntry.request?.qualityHint ?? "low",
    );
    const rightQualityRank: number = this.getQualityRank(
      rightEntry.request?.qualityHint ?? "low",
    );

    if (leftQualityRank !== rightQualityRank) {
      return rightQualityRank - leftQualityRank;
    }

    const leftRequestedAt: number = leftEntry.lastRequestedAt ?? 0;
    const rightRequestedAt: number = rightEntry.lastRequestedAt ?? 0;

    if (leftRequestedAt !== rightRequestedAt) {
      return leftRequestedAt - rightRequestedAt;
    }

    return leftEntry.descriptor.sourceId.localeCompare(
      rightEntry.descriptor.sourceId,
    );
  }

  /**
   * @brief Convert one priority label into a stable numeric rank
   *
   * @param priorityHint - Priority label being ranked
   *
   * @returns Numeric sort rank
   */
  private getPriorityRank(priorityHint: MediaThumbnailPriority): number {
    switch (priorityHint) {
      case "high":
        return 4;
      case "medium":
        return 3;
      case "low":
        return 2;
      case "none":
        return 1;
    }
  }

  /**
   * @brief Convert one quality label into a stable numeric rank
   *
   * @param qualityHint - Quality label being ranked
   *
   * @returns Numeric sort rank
   */
  private getQualityRank(qualityHint: MediaThumbnailQuality): number {
    switch (qualityHint) {
      case "premium-attempt":
        return 4;
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
    }
  }

  /**
   * @brief Check whether the current runtime can satisfy one request
   *
   * @param request - Shared request being evaluated
   *
   * @returns `true` when extraction should be attempted
   */
  private isRequestSupported(request: MediaThumbnailRequest): boolean {
    const runtimeCapabilities: MediaThumbnailRuntimeCapabilities | null =
      this.runtimeAdapter?.getCapabilities() ?? null;

    if (runtimeCapabilities === null) {
      return false;
    }

    switch (request.extractionPolicy.strategy) {
      case "first-frame":
      case "time-hint":
        return runtimeCapabilities.canExtractFirstFrame;
      case "first-non-black":
        return runtimeCapabilities.canExtractNonBlackFrame;
    }
  }

  /**
   * @brief Describe why one request could not be serviced by the current runtime
   *
   * @param request - Shared request that was rejected
   *
   * @returns Human-readable unsupported reason
   */
  private createUnsupportedReason(request: MediaThumbnailRequest): string {
    const runtimeAdapter: MediaThumbnailRuntimeAdapter | null =
      this.runtimeAdapter;

    if (runtimeAdapter === null) {
      return "No thumbnail runtime adapter is registered.";
    }

    if (request.extractionPolicy.strategy === "first-non-black") {
      return `${runtimeAdapter.runtimeId} cannot extract first-non-black thumbnails in this phase.`;
    }

    return `${runtimeAdapter.runtimeId} cannot extract thumbnails for this request in this phase.`;
  }

  /**
   * @brief Require that a runtime adapter exists before extraction begins
   *
   * @returns Registered runtime adapter
   */
  private requireRuntimeAdapter(): MediaThumbnailRuntimeAdapter {
    if (this.runtimeAdapter === null) {
      throw new Error("No thumbnail runtime adapter is registered.");
    }

    return this.runtimeAdapter;
  }

  /**
   * @brief Update one cache entry and immediately publish a new snapshot
   *
   * @param sourceId - Stable source identifier being updated
   * @param state - Next shared thumbnail lifecycle state
   * @param failureReason - Optional failure or unsupported detail
   * @param result - Optional extracted result to cache
   */
  private updateCacheEntryState(
    sourceId: string,
    state: MediaThumbnailState,
    failureReason: string | null,
    result: MediaThumbnailResult | null,
  ): void {
    const cacheEntry: MediaThumbnailCacheEntry | undefined =
      this.cacheEntriesBySourceId.get(sourceId);

    if (cacheEntry === undefined) {
      return;
    }

    this.cacheEntriesBySourceId.set(sourceId, {
      descriptor: this.cloneDescriptor(cacheEntry.descriptor),
      state,
      request:
        cacheEntry.request === null
          ? null
          : this.cloneRequest(cacheEntry.request),
      result: result === null ? null : this.cloneResult(result),
      failureReason,
      isRelevant: cacheEntry.isRelevant,
      lastRequestedAt: cacheEntry.lastRequestedAt,
      lastUpdatedAt: Date.now(),
    });
    this.notifyListeners();
  }

  /**
   * @brief Notify every listener with the latest immutable thumbnail snapshot
   */
  private notifyListeners(): void {
    const thumbnailSnapshot: MediaThumbnailSnapshot = this.getState();

    for (const listener of this.listeners) {
      listener(thumbnailSnapshot);
    }
  }

  /**
   * @brief Release a cached runtime thumbnail when it is invalidated
   *
   * @param result - Cached result being discarded
   *
   * @returns Optional async cleanup promise
   */
  private async releaseCachedResult(
    result: MediaThumbnailResult | null,
  ): Promise<void> {
    if (result === null) {
      return;
    }

    const artifactKey: MediaThumbnailResult["artifactKey"] = result.artifactKey;

    if (artifactKey.cacheKey.length === 0) {
      return;
    }

    await this.vfsController.deleteDerivedArtifact(artifactKey);
  }

  /**
   * @brief Clone one cache entry for immutable external consumption
   *
   * @param cacheEntry - Cache entry being cloned
   *
   * @returns Cloned cache entry
   */
  private cloneCacheEntry(
    cacheEntry: MediaThumbnailCacheEntry,
  ): MediaThumbnailCacheEntry {
    return {
      descriptor: this.cloneDescriptor(cacheEntry.descriptor),
      state: cacheEntry.state,
      request:
        cacheEntry.request === null
          ? null
          : this.cloneRequest(cacheEntry.request),
      result:
        cacheEntry.result === null ? null : this.cloneResult(cacheEntry.result),
      failureReason: cacheEntry.failureReason,
      isRelevant: cacheEntry.isRelevant,
      lastRequestedAt: cacheEntry.lastRequestedAt,
      lastUpdatedAt: cacheEntry.lastUpdatedAt,
    };
  }

  /**
   * @brief Clone one request descriptor
   *
   * @param descriptor - Descriptor being cloned
   *
   * @returns Cloned descriptor
   */
  private cloneDescriptor(
    descriptor: MediaThumbnailDescriptor,
  ): MediaThumbnailDescriptor {
    return {
      itemIds: [...descriptor.itemIds],
      sourceId: descriptor.sourceId,
      sourceDescriptor: {
        sourceId: descriptor.sourceDescriptor.sourceId,
        kind: descriptor.sourceDescriptor.kind,
        originType: descriptor.sourceDescriptor.originType,
        url: descriptor.sourceDescriptor.url,
        mimeType: descriptor.sourceDescriptor.mimeType,
        posterUrl: descriptor.sourceDescriptor.posterUrl,
      },
    };
  }

  /**
   * @brief Clone one thumbnail request
   *
   * @param request - Request being cloned
   *
   * @returns Cloned request
   */
  private cloneRequest(request: MediaThumbnailRequest): MediaThumbnailRequest {
    return {
      descriptor: this.cloneDescriptor(request.descriptor),
      sourceDescriptor: {
        sourceId: request.sourceDescriptor.sourceId,
        kind: request.sourceDescriptor.kind,
        originType: request.sourceDescriptor.originType,
        url: request.sourceDescriptor.url,
        mimeType: request.sourceDescriptor.mimeType,
        posterUrl: request.sourceDescriptor.posterUrl,
      },
      sourceId: request.sourceId,
      priorityHint: request.priorityHint,
      qualityHint: request.qualityHint,
      targetWidth: request.targetWidth,
      targetHeight: request.targetHeight,
      timeHintMs: request.timeHintMs,
      variantSelection: {
        role: request.variantSelection.role,
        desiredQualityTier: request.variantSelection.desiredQualityTier,
        preferStartupLatency: request.variantSelection.preferStartupLatency,
        preferImageQuality: request.variantSelection.preferImageQuality,
        preferPremiumPlayback: request.variantSelection.preferPremiumPlayback,
        maxWidth: request.variantSelection.maxWidth,
        maxHeight: request.variantSelection.maxHeight,
        maxBandwidth: request.variantSelection.maxBandwidth,
        reasons: [...request.variantSelection.reasons],
        notes: [...request.variantSelection.notes],
      },
      extractionPolicy: {
        strategy: request.extractionPolicy.strategy,
        quality: request.extractionPolicy.quality,
        timeoutMs: request.extractionPolicy.timeoutMs,
        targetWidth: request.extractionPolicy.targetWidth,
        targetHeight: request.extractionPolicy.targetHeight,
      },
      audioPolicyDecision: this.cloneAudioPolicyDecision(
        request.audioPolicyDecision,
      ),
    };
  }

  /**
   * @brief Clone one cached thumbnail result
   *
   * @param result - Result being cloned
   *
   * @returns Cloned result
   */
  private cloneResult(result: MediaThumbnailResult): MediaThumbnailResult {
    return {
      sourceId: result.sourceId,
      artifactKey: {
        cacheKey: result.artifactKey.cacheKey,
        identityKey: result.artifactKey.identityKey,
        artifactKind: result.artifactKey.artifactKind,
        variantKey: result.artifactKey.variantKey,
        sourceId: result.artifactKey.sourceId,
      },
      imageUrl: result.imageUrl,
      width: result.width,
      height: result.height,
      frameTimeMs: result.frameTimeMs,
      extractedAt: result.extractedAt,
      wasApproximate: result.wasApproximate,
      debug: {
        resolvedLayer: result.debug.resolvedLayer,
        lookupSteps: result.debug.lookupSteps.map(
          (lookupStep): (typeof result.debug.lookupSteps)[number] => ({
            ...lookupStep,
          }),
        ),
        reusedFromVfs: result.debug.reusedFromVfs,
        fallbackReason: result.debug.fallbackReason,
        audioPolicyDecision: this.cloneAudioPolicyDecision(
          result.debug.audioPolicyDecision,
        ),
      },
    };
  }

  /**
   * @brief Attempt to restore one previously extracted thumbnail from VFS
   *
   * @param request - Shared thumbnail request being resolved
   *
   * @returns Cached thumbnail result, or `null` when VFS had no reusable still
   */
  private async tryRestoreCachedThumbnailResult(
    request: MediaThumbnailRequest,
  ): Promise<MediaThumbnailResult | null> {
    const artifactDescriptor: DerivedArtifactDescriptor =
      this.createArtifactDescriptorForRequest(request);
    const derivedArtifactResult: DerivedArtifactResult =
      await this.vfsController.resolveDerivedArtifact(
        artifactDescriptor.artifactKey,
        "VFS had no previously extracted still for this thumbnail request.",
      );
    const storedArtifact: DerivedArtifactEntry | null =
      derivedArtifactResult.entry;
    const viewUrl: string | null = storedArtifact?.viewUrl ?? null;

    if (storedArtifact === null || viewUrl === null) {
      return null;
    }

    return {
      sourceId: request.sourceId,
      artifactKey: storedArtifact.descriptor.artifactKey,
      imageUrl: viewUrl,
      width: Number(storedArtifact.metadata.width ?? 0),
      height: Number(storedArtifact.metadata.height ?? 0),
      frameTimeMs:
        storedArtifact.metadata.frameTimeMs === null
          ? null
          : Number(storedArtifact.metadata.frameTimeMs ?? 0),
      extractedAt: Number(
        storedArtifact.metadata.extractedAt ?? storedArtifact.updatedAt,
      ),
      wasApproximate: storedArtifact.metadata.wasApproximate === true,
      debug: {
        resolvedLayer: derivedArtifactResult.resolvedLayer,
        lookupSteps: derivedArtifactResult.lookupSteps.map(
          (lookupStep): (typeof derivedArtifactResult.lookupSteps)[number] => ({
            ...lookupStep,
          }),
        ),
        reusedFromVfs: true,
        fallbackReason: derivedArtifactResult.fallbackReason,
        audioPolicyDecision: this.cloneAudioPolicyDecision(
          request.audioPolicyDecision,
        ),
      },
    };
  }

  /**
   * @brief Persist one extracted thumbnail payload through VFS-owned storage
   *
   * @param request - Shared thumbnail request associated with the payload
   * @param extractionResult - Raw runtime extraction payload
   *
   * @returns Renderable thumbnail result backed by VFS storage identity
   */
  private async persistThumbnailResult(
    request: MediaThumbnailRequest,
    extractionResult: MediaThumbnailExtractionResult,
  ): Promise<MediaThumbnailResult> {
    const artifactDescriptor: DerivedArtifactDescriptor =
      this.createArtifactDescriptorForRequest(request);
    const storedArtifact: DerivedArtifactEntry =
      await this.vfsController.storeDerivedArtifact({
        descriptor: artifactDescriptor,
        cachePolicy: {
          ...DEFAULT_CACHE_POLICY,
        },
        contentType: extractionResult.imageContentType,
        metadata: {
          extractedAt: extractionResult.extractedAt,
          frameTimeMs: extractionResult.frameTimeMs,
          height: extractionResult.height,
          sourceId: extractionResult.sourceId,
          targetHeight:
            request.targetHeight ?? request.extractionPolicy.targetHeight,
          targetWidth:
            request.targetWidth ?? request.extractionPolicy.targetWidth,
          wasApproximate: extractionResult.wasApproximate,
          width: extractionResult.width,
        },
        payload: extractionResult.imagePayload,
        payloadKind: "blob",
      });
    const viewUrl: string | null = storedArtifact.viewUrl;

    if (viewUrl === null) {
      throw new Error(
        `VFS could not create a renderable thumbnail URL for ${request.sourceId}.`,
      );
    }

    return {
      sourceId: extractionResult.sourceId,
      artifactKey: storedArtifact.descriptor.artifactKey,
      imageUrl: viewUrl,
      width: extractionResult.width,
      height: extractionResult.height,
      frameTimeMs: extractionResult.frameTimeMs,
      extractedAt: extractionResult.extractedAt,
      wasApproximate: extractionResult.wasApproximate,
      debug: {
        resolvedLayer: "memory-hot",
        lookupSteps: [],
        reusedFromVfs: false,
        fallbackReason: null,
        audioPolicyDecision: this.cloneAudioPolicyDecision(
          request.audioPolicyDecision,
        ),
      },
    };
  }

  /**
   * @brief Clone one shared audio-policy decision for thumbnail debug state
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
   * @brief Build the stable VFS artifact descriptor associated with one request
   *
   * @param request - Shared thumbnail request
   *
   * @returns Stable artifact descriptor
   */
  private createArtifactDescriptorForRequest(
    request: MediaThumbnailRequest,
  ): DerivedArtifactDescriptor {
    const artifactVariantKey: string = [
      request.qualityHint,
      `${request.targetWidth ?? request.extractionPolicy.targetWidth ?? "auto"}x${request.targetHeight ?? request.extractionPolicy.targetHeight ?? "auto"}`,
      request.extractionPolicy.strategy,
      `${request.timeHintMs ?? "start"}`,
    ].join(":");

    return this.vfsController.createDerivedArtifactDescriptor(
      request.sourceDescriptor,
      "thumbnail-still",
      artifactVariantKey,
    );
  }
}
