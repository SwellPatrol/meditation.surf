/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PreviewSchedulerDecisionReason } from "./PreviewSchedulerDecisionReason";

/**
 * @brief Deterministic score metadata attached to one preview candidate
 */
export type PreviewCandidateScore = {
  reason: PreviewSchedulerDecisionReason;
  baseValue: number;
  reuseBonus: number;
  totalValue: number;
};
