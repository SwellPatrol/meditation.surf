/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PlaybackSource } from "./playbackTypes";

/**
 * Shared playback controller contract implemented separately per platform.
 * The contract stays intentionally small so each app can keep its own player.
 */
export interface PlaybackController {
  initialize(): Promise<void> | void;
  load(source: PlaybackSource): Promise<void>;
  play(): Promise<void> | void;
  pause(): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  destroy(): Promise<void> | void;
}
