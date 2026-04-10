/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { CacheKey } from "../cache/CacheTypes";
import type {
  PersistenceAdapter,
  PersistenceRecord,
} from "../persistence/PersistenceTypes";
import type {
  DerivedArtifactEntry,
  DerivedArtifactWrite,
} from "./DerivedArtifactTypes";

/**
 * @brief Generic derived-artifact store used for thumbnails and future blobs
 */
export class DerivedArtifactStore {
  private readonly persistenceAdapter: PersistenceAdapter;
  private readonly leasedObjectUrlsByKey: Map<CacheKey, string>;

  /**
   * @brief Build the derived-artifact store
   *
   * @param persistenceAdapter - Persistence adapter used for record storage
   */
  public constructor(persistenceAdapter: PersistenceAdapter) {
    this.persistenceAdapter = persistenceAdapter;
    this.leasedObjectUrlsByKey = new Map<CacheKey, string>();
  }

  /**
   * @brief Resolve one stored artifact entry by stable cache key
   *
   * @param artifactKey - Stable artifact key being read
   *
   * @returns Stored artifact entry, or `null` when absent
   */
  public async getArtifact(
    artifactKey: CacheKey,
  ): Promise<DerivedArtifactEntry | null> {
    const storedRecord: PersistenceRecord | null =
      await this.persistenceAdapter.get(artifactKey);

    if (storedRecord === null) {
      return null;
    }

    return this.createArtifactEntry(storedRecord);
  }

  /**
   * @brief Persist one artifact payload and return the resolved stored entry
   *
   * @param write - Artifact payload being stored
   *
   * @returns Stored artifact entry
   */
  public async putArtifact(
    write: DerivedArtifactWrite,
  ): Promise<DerivedArtifactEntry> {
    const nowMs: number = Date.now();
    const byteLength: number | null = this.estimateByteLength(
      write.payload,
      write.payloadKind,
    );

    this.releaseArtifact(write.descriptor.artifactKey);

    const storedRecord: PersistenceRecord = await this.persistenceAdapter.put({
      key: write.descriptor.artifactKey,
      tier: write.cachePolicy.allowPersistent ? "persistent" : "memory",
      contentType: write.contentType,
      metadata: {
        artifactKind: write.descriptor.artifactKind,
        sourceId: write.descriptor.source.sourceId,
        sourceKind: write.descriptor.source.kind,
        sourceUrl: write.descriptor.source.url,
        variantKey: write.descriptor.variantKey,
        ...write.metadata,
      },
      body: write.payload,
      bodyKind: write.payloadKind,
      createdAt: nowMs,
      updatedAt: nowMs,
      lastAccessedAt: nowMs,
      byteLength,
    });

    return this.createArtifactEntry(storedRecord, write.descriptor);
  }

  /**
   * @brief Delete one stored artifact and release any leased render URL
   *
   * @param artifactKey - Stable artifact key being deleted
   */
  public async deleteArtifact(artifactKey: CacheKey): Promise<void> {
    this.releaseArtifact(artifactKey);
    await this.persistenceAdapter.delete(artifactKey);
  }

  /**
   * @brief Release any leased object URL without deleting the stored bytes
   *
   * @param artifactKey - Stable artifact key whose URL lease should end
   */
  public releaseArtifact(artifactKey: CacheKey): void {
    const leasedObjectUrl: string | undefined =
      this.leasedObjectUrlsByKey.get(artifactKey);

    if (leasedObjectUrl === undefined) {
      return;
    }

    URL.revokeObjectURL(leasedObjectUrl);
    this.leasedObjectUrlsByKey.delete(artifactKey);
  }

  /**
   * @brief Release every leased object URL owned by the artifact store
   */
  public releaseAllArtifacts(): void {
    for (const artifactKey of this.leasedObjectUrlsByKey.keys()) {
      this.releaseArtifact(artifactKey);
    }
  }

  /**
   * @brief Create a renderable artifact entry from one stored persistence record
   *
   * @param record - Persisted record being surfaced
   * @param descriptorOverride - Optional descriptor known by the caller
   *
   * @returns Renderable artifact entry
   */
  private createArtifactEntry(
    record: PersistenceRecord,
    descriptorOverride?: DerivedArtifactWrite["descriptor"],
  ): DerivedArtifactEntry {
    const descriptor: DerivedArtifactEntry["descriptor"] =
      descriptorOverride ??
      ({
        artifactKey: record.key,
        source: {
          sourceId: `${record.metadata.sourceId ?? "unknown-source"}`,
          kind: (record.metadata.sourceKind ?? "unknown") as
            | "hls"
            | "mp4"
            | "torrent"
            | "unknown",
          originType: "unknown",
          url: `${record.metadata.sourceUrl ?? ""}`,
          mimeType: null,
          posterUrl: null,
        },
        artifactKind: `${record.metadata.artifactKind ?? "artifact"}`,
        variantKey:
          record.metadata.variantKey === null
            ? null
            : `${record.metadata.variantKey ?? ""}`,
      } satisfies DerivedArtifactEntry["descriptor"]);
    const viewUrl: string | null = this.createViewUrl(record);

    return {
      descriptor,
      tier: record.tier,
      contentType: record.contentType ?? "application/octet-stream",
      byteLength: record.byteLength,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      metadata: {
        ...record.metadata,
      },
      viewUrl,
    };
  }

  /**
   * @brief Create or reuse a render URL for one stored artifact record
   *
   * @param record - Persisted record being surfaced
   *
   * @returns Render URL, or `null` when the environment cannot create one
   */
  private createViewUrl(record: PersistenceRecord): string | null {
    if (
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return null;
    }

    const existingObjectUrl: string | undefined =
      this.leasedObjectUrlsByKey.get(record.key);

    if (existingObjectUrl !== undefined) {
      return existingObjectUrl;
    }

    const artifactBlob: Blob = this.toBlob(record.body, record.contentType);
    const objectUrl: string = URL.createObjectURL(artifactBlob);

    this.leasedObjectUrlsByKey.set(record.key, objectUrl);

    return objectUrl;
  }

  /**
   * @brief Convert a persistence body into a blob suitable for object URLs
   *
   * @param body - Stored body value
   * @param contentType - Optional MIME type
   *
   * @returns Blob that wraps the stored body
   */
  private toBlob(body: Blob | string, contentType: string | null): Blob {
    if (body instanceof Blob) {
      return body;
    }

    return new Blob([body], {
      type: contentType ?? "application/octet-stream",
    });
  }

  /**
   * @brief Estimate the persisted byte length for one artifact payload
   *
   * @param payload - Payload being stored
   * @param payloadKind - Declared payload kind
   *
   * @returns Best-effort byte length
   */
  private estimateByteLength(
    payload: Blob | string,
    payloadKind: DerivedArtifactWrite["payloadKind"],
  ): number | null {
    if (payloadKind === "blob" && payload instanceof Blob) {
      return payload.size;
    }

    if (typeof payload === "string") {
      return new Blob([payload]).size;
    }

    return null;
  }
}
