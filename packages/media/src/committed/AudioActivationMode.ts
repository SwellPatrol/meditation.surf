/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Audio policy modes available to committed playback decisions
 */
export type AudioActivationMode =
  | "muted-preview"
  | "committed-playback"
  | "fallback-stereo"
  | "premium-attempt";
