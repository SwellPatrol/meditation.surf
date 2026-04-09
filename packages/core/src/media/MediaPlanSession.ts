/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaPlanReason } from "./MediaPlanReason";
import type { MediaPlaybackLane } from "./MediaPlaybackLane";
import type { MediaRendererKind } from "./MediaRendererKind";
import type { MediaSessionPriority } from "./MediaSessionPriority";
import type { MediaSessionRole } from "./MediaSessionRole";
import type { MediaSessionVisibility } from "./MediaSessionVisibility";
import type { MediaSourceDescriptor } from "./MediaSourceDescriptor";
import type { MediaWarmth } from "./MediaWarmth";

/**
 * @brief Planned logical media session derived from current intent and content state
 */
export type MediaPlanSession = {
  sessionId: string;
  itemId: string | null;
  source: MediaSourceDescriptor | null;
  role: MediaSessionRole;
  desiredPlaybackLane: MediaPlaybackLane | null;
  desiredRendererKind: MediaRendererKind;
  desiredWarmth: MediaWarmth;
  priority: MediaSessionPriority;
  visibility: MediaSessionVisibility;
  reason: MediaPlanReason;
};
