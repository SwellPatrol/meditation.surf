/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaThumbnailExtractionStrategy } from "./MediaThumbnailExtractionPolicy";
import type { MediaThumbnailQualityIntent } from "./MediaThumbnailQualityIntent";

/**
 * @brief Shared summary of one bounded thumbnail extraction attempt
 */
export type MediaThumbnailExtractionAttempt = {
  requestedStrategy: MediaThumbnailExtractionStrategy;
  strategyUsed: MediaThumbnailExtractionStrategy;
  qualityIntent: MediaThumbnailQualityIntent;
  timeoutMs: number | null;
  candidateWindowMs: number;
  candidateFrameStepMs: number;
  maxCandidateFrames: number;
  maxAttemptCount: number;
  attemptedFrameCount: number;
  completedFrameCount: number;
  timedOut: boolean;
  unsupported: boolean;
  startedAt: number;
  finishedAt: number;
};
