/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { CacheKey, CacheTier } from "../cache/CacheTypes";
import type { ByteRange } from "../ranges/RangeTypes";
import type { ReadableFileDescriptor } from "../sources/ReadableFileTypes";

/**
 * @brief Stored manifest entry managed by VFS storage primitives
 */
export type ManifestStorageEntry = {
  key: CacheKey;
  source: ReadableFileDescriptor;
  tier: CacheTier;
  manifestText: string;
  contentType: string | null;
  storedAt: number;
};

/**
 * @brief Stored range entry used for init, startup, and hot-range caching
 */
export type RangeStorageEntry = {
  key: CacheKey;
  source: ReadableFileDescriptor;
  purpose: "init-segment" | "startup-window" | "hot-range";
  tier: CacheTier;
  range: ByteRange;
  bytes: Uint8Array;
  contentType: string | null;
  storedAt: number;
};
