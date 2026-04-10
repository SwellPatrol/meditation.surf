/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Runtime-configured preview budget enforced by the shared scheduler
 */
export type PreviewSchedulerBudget = {
  maxWarmSessions: number;
  maxActivePreviewSessions: number;
  maxHiddenSessions: number;
  maxPreviewReuseMs: number;
  maxPreviewOverlapMs: number;
  keepWarmAfterBlurMs: number;
};
