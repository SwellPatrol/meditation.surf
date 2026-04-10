/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { CommittedPlaybackLanePreference } from "../committed/CommittedPlaybackLanePreference";
import type { PreviewSchedulerBudget } from "../preview/PreviewSchedulerBudget";
import type { MediaPlaybackLane } from "../sessions/MediaPlaybackLane";

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
  supportsCommittedPlayback: boolean;
  supportsCommittedPlaybackAudio: boolean;
  supportsFallbackStereoAudio: boolean;
  supportsPremiumCommittedPlayback: boolean;
  supportsPremiumAudioActivation: boolean;
  committedPlaybackLanePreference: CommittedPlaybackLanePreference;
  committedPlaybackLanes: MediaPlaybackLane[];
  existingBackgroundPlaybackLane: MediaPlaybackLane | null;
  previewSchedulerBudget: PreviewSchedulerBudget;
};
