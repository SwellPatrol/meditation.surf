/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { DerivedArtifactStore } from "./artifacts/DerivedArtifactStore";
import type {
  DerivedArtifactDescriptor,
  DerivedArtifactEntry,
  DerivedArtifactWrite,
} from "./artifacts/DerivedArtifactTypes";
import {
  type CacheEntry,
  type CacheKey,
  type CachePolicy,
  DEFAULT_CACHE_POLICY,
} from "./cache/CacheTypes";
import { HttpOriginAdapter } from "./http/HttpOriginAdapter";
import { IndexedDbPersistenceAdapter } from "./persistence/IndexedDbPersistenceAdapter";
import type {
  PersistenceAdapter,
  PersistenceRecord,
} from "./persistence/PersistenceTypes";
import type { ByteRange } from "./ranges/RangeTypes";
import { VfsServiceWorkerCoordinator } from "./service-worker/VfsServiceWorkerCoordinator";
import type { ReadableFileDescriptor } from "./sources/ReadableFileTypes";
import { ReadableFileDescriptorFactory } from "./sources/ReadableFileTypes";
import type {
  ManifestStorageEntry,
  RangeStorageEntry,
} from "./startup/StorageTypes";
import type { VfsHandle } from "./VfsHandle";
import type { VfsNode } from "./VfsNode";
import { VfsPath } from "./VfsPath";
import type { VfsSnapshot } from "./VfsSnapshot";

class ControllerVfsHandle implements VfsHandle {
  public readonly cacheKey: CacheKey;
  public readonly path: VfsPath;

  private readonly persistenceAdapter: PersistenceAdapter;

  /**
   * @brief Build one concrete VFS handle
   *
   * @param cacheKey - Stable cache key represented by the handle
   * @param persistenceAdapter - Persistence adapter used for lookup
   */
  public constructor(
    cacheKey: CacheKey,
    persistenceAdapter: PersistenceAdapter,
  ) {
    this.cacheKey = cacheKey;
    this.path = VfsPath.fromCacheKey(cacheKey);
    this.persistenceAdapter = persistenceAdapter;
  }

  /**
   * @inheritdoc
   */
  public async getEntry(): Promise<CacheEntry | null> {
    const record: PersistenceRecord | null = await this.persistenceAdapter.get(
      this.cacheKey,
    );

    if (record === null) {
      return null;
    }

    return {
      key: record.key,
      tier: record.tier,
      contentType: record.contentType,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastAccessedAt: record.lastAccessedAt,
      byteLength: record.byteLength,
      metadata: {
        ...record.metadata,
      },
    };
  }
}

/**
 * @brief Generic controller that owns storage identity and persistence flows
 */
export class VfsController {
  public readonly artifacts: DerivedArtifactStore;
  public readonly httpOrigins: HttpOriginAdapter;
  public readonly persistenceAdapter: PersistenceAdapter;
  public readonly serviceWorker: VfsServiceWorkerCoordinator;

  /**
   * @brief Build the VFS controller
   *
   * @param persistenceAdapter - Optional persistence adapter override
   * @param httpOrigins - Optional HTTP origin adapter override
   * @param serviceWorker - Optional service-worker coordinator override
   */
  public constructor(
    persistenceAdapter: PersistenceAdapter = new IndexedDbPersistenceAdapter(),
    httpOrigins: HttpOriginAdapter = new HttpOriginAdapter(),
    serviceWorker: VfsServiceWorkerCoordinator = new VfsServiceWorkerCoordinator(),
  ) {
    this.persistenceAdapter = persistenceAdapter;
    this.httpOrigins = httpOrigins;
    this.serviceWorker = serviceWorker;
    this.artifacts = new DerivedArtifactStore(this.persistenceAdapter);
  }

  /**
   * @brief Create one readable-source descriptor from raw playback metadata
   *
   * @param sourceId - Stable logical source identifier
   * @param playbackSource - Raw playback metadata
   *
   * @returns Storage-facing source descriptor
   */
  public createReadableSourceDescriptor(
    sourceId: string,
    playbackSource: {
      url: string;
      mimeType: string | null;
      posterUrl: string | null;
    },
  ): ReadableFileDescriptor {
    return ReadableFileDescriptorFactory.create(sourceId, playbackSource);
  }

  /**
   * @brief Build a stable cache key for one manifest payload
   *
   * @param source - Source descriptor associated with the manifest
   *
   * @returns Stable manifest cache key
   */
  public createManifestCacheKey(source: ReadableFileDescriptor): CacheKey {
    return this.composeCacheKey("manifest", source.sourceId, source.url);
  }

  /**
   * @brief Build a stable cache key for one init segment payload
   *
   * @param source - Source descriptor associated with the bytes
   * @param variantKey - Optional variant hint
   *
   * @returns Stable init-segment cache key
   */
  public createInitSegmentCacheKey(
    source: ReadableFileDescriptor,
    variantKey: string | null = null,
  ): CacheKey {
    return this.composeCacheKey(
      "init-segment",
      source.sourceId,
      variantKey ?? "default",
    );
  }

  /**
   * @brief Build a stable cache key for one startup-window byte range
   *
   * @param source - Source descriptor associated with the bytes
   * @param range - Startup range being cached
   * @param variantKey - Optional variant hint
   *
   * @returns Stable startup-window cache key
   */
  public createStartupWindowCacheKey(
    source: ReadableFileDescriptor,
    range: ByteRange,
    variantKey: string | null = null,
  ): CacheKey {
    return this.composeCacheKey(
      "startup-window",
      source.sourceId,
      variantKey ?? "default",
      this.serializeRange(range),
    );
  }

  /**
   * @brief Build a stable cache key for one hot range entry
   *
   * @param source - Source descriptor associated with the bytes
   * @param range - Hot byte range being cached
   *
   * @returns Stable hot-range cache key
   */
  public createHotRangeCacheKey(
    source: ReadableFileDescriptor,
    range: ByteRange,
  ): CacheKey {
    return this.composeCacheKey(
      "hot-range",
      source.sourceId,
      this.serializeRange(range),
    );
  }

  /**
   * @brief Build a stable cache key for one derived artifact payload
   *
   * @param source - Source descriptor that owns the artifact
   * @param artifactKind - Generic artifact family label
   * @param variantKey - Optional artifact variant hint
   *
   * @returns Stable derived-artifact cache key
   */
  public createDerivedArtifactCacheKey(
    source: ReadableFileDescriptor,
    artifactKind: string,
    variantKey: string | null = null,
  ): CacheKey {
    return this.composeCacheKey(
      "derived-artifact",
      source.sourceId,
      artifactKind,
      variantKey ?? "default",
    );
  }

  /**
   * @brief Create one generic derived-artifact descriptor
   *
   * @param source - Source that owns the artifact
   * @param artifactKind - Generic artifact family label
   * @param variantKey - Optional artifact variant hint
   *
   * @returns Derived artifact descriptor
   */
  public createDerivedArtifactDescriptor(
    source: ReadableFileDescriptor,
    artifactKind: string,
    variantKey: string | null = null,
  ): DerivedArtifactDescriptor {
    return {
      artifactKey: this.createDerivedArtifactCacheKey(
        source,
        artifactKind,
        variantKey,
      ),
      source,
      artifactKind,
      variantKey,
    };
  }

  /**
   * @brief Persist one derived artifact and return the resolved stored entry
   *
   * @param write - Artifact payload being written
   *
   * @returns Stored artifact entry
   */
  public async storeDerivedArtifact(
    write: DerivedArtifactWrite,
  ): Promise<DerivedArtifactEntry> {
    return this.artifacts.putArtifact(write);
  }

  /**
   * @brief Resolve one stored derived artifact by cache key
   *
   * @param artifactKey - Stable artifact key being resolved
   *
   * @returns Stored artifact entry, or `null` when absent
   */
  public async getDerivedArtifact(
    artifactKey: CacheKey,
  ): Promise<DerivedArtifactEntry | null> {
    return this.artifacts.getArtifact(artifactKey);
  }

  /**
   * @brief Release a leased artifact URL without deleting stored bytes
   *
   * @param artifactKey - Stable artifact key whose render URL should be released
   */
  public releaseDerivedArtifact(artifactKey: CacheKey): void {
    this.artifacts.releaseArtifact(artifactKey);
  }

  /**
   * @brief Delete one stored artifact and release any render URL lease
   *
   * @param artifactKey - Stable artifact key being deleted
   */
  public async deleteDerivedArtifact(artifactKey: CacheKey): Promise<void> {
    await this.artifacts.deleteArtifact(artifactKey);
  }

  /**
   * @brief Persist one manifest payload in VFS-owned storage
   *
   * @param source - Source descriptor associated with the manifest
   * @param manifestText - Manifest text payload
   * @param contentType - Optional manifest MIME type
   *
   * @returns Stored manifest entry
   */
  public async storeManifest(
    source: ReadableFileDescriptor,
    manifestText: string,
    contentType: string | null,
  ): Promise<ManifestStorageEntry> {
    const storedRecord: PersistenceRecord = await this.persistenceAdapter.put({
      key: this.createManifestCacheKey(source),
      tier: "persistent",
      contentType,
      metadata: {
        entryKind: "manifest",
        sourceId: source.sourceId,
        sourceUrl: source.url,
      },
      body: manifestText,
      bodyKind: "text",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      byteLength: new Blob([manifestText]).size,
    });

    return {
      key: storedRecord.key,
      source,
      tier: storedRecord.tier,
      manifestText,
      contentType,
      storedAt: storedRecord.updatedAt,
    };
  }

  /**
   * @brief Read one previously stored manifest entry
   *
   * @param source - Source descriptor associated with the manifest
   *
   * @returns Stored manifest entry, or `null` when absent
   */
  public async getManifest(
    source: ReadableFileDescriptor,
  ): Promise<ManifestStorageEntry | null> {
    const storedRecord: PersistenceRecord | null =
      await this.persistenceAdapter.get(this.createManifestCacheKey(source));

    if (storedRecord === null || typeof storedRecord.body !== "string") {
      return null;
    }

    return {
      key: storedRecord.key,
      source,
      tier: storedRecord.tier,
      manifestText: storedRecord.body,
      contentType: storedRecord.contentType,
      storedAt: storedRecord.updatedAt,
    };
  }

  /**
   * @brief Persist one init segment, startup window, or hot-range payload
   *
   * @param source - Source descriptor associated with the bytes
   * @param purpose - Explicit range-storage purpose
   * @param range - Stored byte range
   * @param bytes - Byte payload being cached
   * @param contentType - Optional MIME type associated with the bytes
   * @param variantKey - Optional variant hint for init or startup caches
   *
   * @returns Stored range entry
   */
  public async storeRangeEntry(
    source: ReadableFileDescriptor,
    purpose: RangeStorageEntry["purpose"],
    range: ByteRange,
    bytes: Uint8Array,
    contentType: string | null,
    variantKey: string | null = null,
  ): Promise<RangeStorageEntry> {
    const cacheKey: CacheKey = this.createRangeStorageKey(
      source,
      purpose,
      range,
      variantKey,
    );
    const storedRecord: PersistenceRecord = await this.persistenceAdapter.put({
      key: cacheKey,
      tier: "persistent",
      contentType,
      metadata: {
        entryKind: purpose,
        sourceId: source.sourceId,
        range: this.serializeRange(range),
        variantKey,
      },
      body: new Blob(
        [
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer,
        ],
        {
          type: contentType ?? "application/octet-stream",
        },
      ),
      bodyKind: "blob",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      byteLength: bytes.byteLength,
    });

    return {
      key: storedRecord.key,
      source,
      purpose,
      tier: storedRecord.tier,
      range,
      bytes,
      contentType,
      storedAt: storedRecord.updatedAt,
    };
  }

  /**
   * @brief Read one stored init segment, startup window, or hot-range entry
   *
   * @param source - Source descriptor associated with the bytes
   * @param purpose - Explicit range-storage purpose
   * @param range - Byte range being resolved
   * @param variantKey - Optional variant hint for init or startup caches
   *
   * @returns Stored range entry, or `null` when absent
   */
  public async getRangeEntry(
    source: ReadableFileDescriptor,
    purpose: RangeStorageEntry["purpose"],
    range: ByteRange,
    variantKey: string | null = null,
  ): Promise<RangeStorageEntry | null> {
    const cacheKey: CacheKey = this.createRangeStorageKey(
      source,
      purpose,
      range,
      variantKey,
    );
    const storedRecord: PersistenceRecord | null =
      await this.persistenceAdapter.get(cacheKey);

    if (storedRecord === null || !(storedRecord.body instanceof Blob)) {
      return null;
    }

    const byteBuffer: ArrayBuffer = await storedRecord.body.arrayBuffer();

    return {
      key: storedRecord.key,
      source,
      purpose,
      tier: storedRecord.tier,
      range,
      bytes: new Uint8Array(byteBuffer),
      contentType: storedRecord.contentType,
      storedAt: storedRecord.updatedAt,
    };
  }

  /**
   * @brief Build one inspectable VFS handle for a stable cache key
   *
   * @param cacheKey - Stable cache key being exposed
   *
   * @returns Inspectable handle
   */
  public getHandle(cacheKey: CacheKey): VfsHandle {
    return new ControllerVfsHandle(cacheKey, this.persistenceAdapter);
  }

  /**
   * @brief Return the current inspectable VFS snapshot
   *
   * @returns Snapshot of persisted VFS nodes
   */
  public async getSnapshot(): Promise<VfsSnapshot> {
    const records: PersistenceRecord[] = await this.persistenceAdapter.list();
    const nodes: VfsNode[] = records.map(
      (record: PersistenceRecord): VfsNode => ({
        key: record.key,
        nodeType: this.resolveNodeType(record.key),
        tier: record.tier,
        path: VfsPath.fromCacheKey(record.key),
        byteLength: record.byteLength,
        updatedAt: record.updatedAt,
      }),
    );

    return {
      nodes,
      generatedAt: Date.now(),
    };
  }

  /**
   * @brief Release every leased artifact URL owned by the controller
   */
  public destroy(): void {
    this.artifacts.releaseAllArtifacts();
  }

  /**
   * @brief Expose the shared default cache policy without duplicating literals
   *
   * @returns Conservative default cache policy
   */
  public getDefaultCachePolicy(): CachePolicy {
    return {
      ...DEFAULT_CACHE_POLICY,
    };
  }

  /**
   * @brief Compose one stable human-readable cache key
   *
   * @param parts - Ordered cache-key components
   *
   * @returns Stable cache key
   */
  private composeCacheKey(...parts: Array<string | number>): CacheKey {
    const serializedParts: string[] = parts.map(
      (part: string | number): string =>
        `${part}`.replaceAll("|", "_").replaceAll(":", "_"),
    );

    return serializedParts.join("|");
  }

  /**
   * @brief Serialize one byte range into a compact cache-key fragment
   *
   * @param range - Byte range being serialized
   *
   * @returns Compact range string
   */
  private serializeRange(range: ByteRange): string {
    return `${range.startOffset}-${range.endOffsetExclusive ?? "end"}`;
  }

  /**
   * @brief Build the stable cache key used for one stored range entry
   *
   * @param source - Source descriptor associated with the bytes
   * @param purpose - Explicit range-storage purpose
   * @param range - Byte range being cached
   * @param variantKey - Optional variant hint
   *
   * @returns Stable range-storage cache key
   */
  private createRangeStorageKey(
    source: ReadableFileDescriptor,
    purpose: RangeStorageEntry["purpose"],
    range: ByteRange,
    variantKey: string | null,
  ): CacheKey {
    switch (purpose) {
      case "init-segment":
        return this.composeCacheKey(
          "init-segment",
          source.sourceId,
          variantKey ?? "default",
          this.serializeRange(range),
        );
      case "startup-window":
        return this.composeCacheKey(
          "startup-window",
          source.sourceId,
          variantKey ?? "default",
          this.serializeRange(range),
        );
      case "hot-range":
        return this.composeCacheKey(
          "hot-range",
          source.sourceId,
          this.serializeRange(range),
        );
    }
  }

  /**
   * @brief Infer the debug node type from one stable cache key
   *
   * @param cacheKey - Stable cache key being inspected
   *
   * @returns Snapshot node type
   */
  private resolveNodeType(cacheKey: CacheKey): VfsNode["nodeType"] {
    if (cacheKey.startsWith("derived-artifact|")) {
      return "artifact";
    }

    if (cacheKey.startsWith("manifest|")) {
      return "manifest";
    }

    if (
      cacheKey.startsWith("init-segment|") ||
      cacheKey.startsWith("startup-window|") ||
      cacheKey.startsWith("hot-range|")
    ) {
      return "range";
    }

    return "unknown";
  }
}
