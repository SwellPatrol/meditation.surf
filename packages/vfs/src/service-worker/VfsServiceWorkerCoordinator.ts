/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { CacheKey, CacheTier } from "../cache/CacheTypes";

/**
 * @brief Debug event emitted by the generic VFS service-worker coordinator
 */
export type VfsServiceWorkerEvent = {
  requestUrl: string;
  cacheKey: CacheKey;
  eventType: "lookup" | "miss" | "write-through";
  tier: CacheTier;
  recordedAt: number;
};

/**
 * @brief Immutable debug snapshot exposed by the service-worker coordinator
 */
export type VfsServiceWorkerSnapshot = {
  events: VfsServiceWorkerEvent[];
  generatedAt: number;
};

/**
 * @brief Generic coordinator that records storage lookups and write-through work
 */
export class VfsServiceWorkerCoordinator {
  private readonly events: VfsServiceWorkerEvent[];

  /**
   * @brief Build the generic service-worker coordinator
   */
  public constructor() {
    this.events = [];
  }

  /**
   * @brief Record one service-worker storage lookup
   *
   * @param requestUrl - Request URL observed by the runtime
   * @param cacheKey - Stable storage key consulted by VFS
   * @param tier - Tier consulted for the request
   * @param eventType - Lookup outcome that was observed
   */
  public recordEvent(
    requestUrl: string,
    cacheKey: CacheKey,
    tier: CacheTier,
    eventType: VfsServiceWorkerEvent["eventType"],
  ): void {
    this.events.push({
      requestUrl,
      cacheKey,
      eventType,
      tier,
      recordedAt: Date.now(),
    });
  }

  /**
   * @brief Return the immutable service-worker debug snapshot
   *
   * @returns Snapshot of recorded storage events
   */
  public getSnapshot(): VfsServiceWorkerSnapshot {
    return {
      events: this.events.map(
        (event: VfsServiceWorkerEvent): VfsServiceWorkerEvent => ({
          ...event,
        }),
      ),
      generatedAt: Date.now(),
    };
  }

  /**
   * @brief Clear every recorded debug event
   */
  public reset(): void {
    this.events.length = 0;
  }
}
