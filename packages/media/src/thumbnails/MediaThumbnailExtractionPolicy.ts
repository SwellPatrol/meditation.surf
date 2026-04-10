/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Shared thumbnail quality intent carried from browse orchestration to runtimes
 */
export type MediaThumbnailQuality = "low" | "medium" | "high";

/**
 * @brief Shared thumbnail priority intent used to order pending extraction work
 */
export type MediaThumbnailPriority = "none" | "low" | "medium" | "high";

/**
 * @brief Conservative extraction strategies supported by the shared thumbnail system
 */
export type MediaThumbnailExtractionStrategy =
  | "first-frame"
  | "first-non-black"
  | "time-hint";

/**
 * @brief Runtime-agnostic thumbnail extraction policy
 */
export type MediaThumbnailExtractionPolicy = {
  strategy: MediaThumbnailExtractionStrategy;
  quality: MediaThumbnailQuality;
  timeoutMs: number | null;
  targetWidth: number | null;
  targetHeight: number | null;
};
