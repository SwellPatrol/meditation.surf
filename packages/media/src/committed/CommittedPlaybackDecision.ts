/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaPlaybackLane } from "../sessions/MediaPlaybackLane";
import type { MediaRendererKind } from "../sessions/MediaRendererKind";
import type { AudioActivationMode } from "./AudioActivationMode";
import type { CommittedPlaybackDecisionReason } from "./CommittedPlaybackDecisionReason";
import type { CommittedPlaybackLanePreference } from "./CommittedPlaybackLanePreference";
import type { CommittedPlaybackMode } from "./CommittedPlaybackMode";

/**
 * @brief Pure chooser output describing one committed playback lane decision
 */
export type CommittedPlaybackDecision = {
  mode: CommittedPlaybackMode;
  preferredLane: MediaPlaybackLane | null;
  chosenLane: MediaPlaybackLane | null;
  preferredRendererKind: MediaRendererKind | null;
  fallbackOrder: MediaPlaybackLane[];
  reasons: CommittedPlaybackDecisionReason[];
  reasonDetails: string[];
  audioActivationMode: AudioActivationMode;
  usedPreferredLane: boolean;
  usedFallbackLane: boolean;
  lanePreference: CommittedPlaybackLanePreference | null;
  startPositionSeconds: number;
};
