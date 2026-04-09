/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaPlaybackLane } from "../sessions/MediaPlaybackLane";
import type { MediaRendererKind } from "../sessions/MediaRendererKind";
import type { MediaSessionRole } from "../sessions/MediaSessionRole";
import type { MediaWarmth } from "../sessions/MediaWarmth";
import type { MediaSourceDescriptor } from "../sources/MediaSourceDescriptor";
import type { MediaPlanReason } from "./MediaPlanReason";
import type { MediaSessionPriority } from "./MediaSessionPriority";
import type { MediaSessionVisibility } from "./MediaSessionVisibility";

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
