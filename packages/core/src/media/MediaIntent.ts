/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaPlaybackLane } from "./MediaPlaybackLane";
import type { MediaRendererKind } from "./MediaRendererKind";
import type { MediaSessionRole } from "./MediaSessionRole";
import type { MediaSourceDescriptor } from "./MediaSourceDescriptor";
import type { MediaWarmth } from "./MediaWarmth";

/**
 * @brief Shared orchestration intent describing what media should be warmed or played
 */
export type MediaIntent = {
  itemId: string | null;
  role: MediaSessionRole;
  source: MediaSourceDescriptor | null;
  preferredPlaybackLane: MediaPlaybackLane | null;
  preferredRendererKind: MediaRendererKind | null;
  targetWarmth: MediaWarmth;
};
