/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PreviewSchedulerBudget } from "../preview/PreviewSchedulerBudget";

/**
 * @brief Runtime execution features currently available in one app shell
 */
export type MediaRuntimeCapabilities = {
  canWarmFirstFrame: boolean;
  canActivateBackground: boolean;
  canPreviewInline: boolean;
  canKeepHiddenWarmSession: boolean;
  canPromoteWarmSession: boolean;
  canRunMultipleWarmSessions: boolean;
  previewSchedulerBudget: PreviewSchedulerBudget;
};
