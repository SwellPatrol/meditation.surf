/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaSourceDescriptor } from "../sources/MediaSourceDescriptor";
import type { PreviewCandidateScore } from "./PreviewCandidateScore";
import type { PreviewSchedulerDecisionReason } from "./PreviewSchedulerDecisionReason";
import type { PreviewWarmState } from "./PreviewWarmState";

/**
 * @brief One logical preview target considered by the shared scheduler
 */
export type PreviewCandidate = {
  candidateId: string;
  sessionId: string;
  itemId: string;
  source: MediaSourceDescriptor;
  rowIndex: number | null;
  itemIndex: number | null;
  reason: PreviewSchedulerDecisionReason;
  score: PreviewCandidateScore;
  currentWarmState: PreviewWarmState;
  focusStartedAtMs: number | null;
  lastFocusedAtMs: number | null;
};
