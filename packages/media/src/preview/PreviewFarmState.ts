/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PreviewCandidate } from "./PreviewCandidate";
import type { PreviewSchedulerBudget } from "./PreviewSchedulerBudget";
import type { PreviewSchedulerDecision } from "./PreviewSchedulerDecision";
import type { PreviewSessionAssignment } from "./PreviewSessionAssignment";

/**
 * @brief Complete preview-farm debug state for one deterministic plan
 */
export type PreviewFarmState = {
  budget: PreviewSchedulerBudget;
  candidates: PreviewCandidate[];
  decisions: PreviewSchedulerDecision[];
  sessionAssignments: PreviewSessionAssignment[];
  activeSessionIds: string[];
  warmedSessionIds: string[];
  retainedSessionIds: string[];
  evictedSessionIds: string[];
  deferredSessionIds: string[];
  nextTransitionAtMs: number | null;
};
