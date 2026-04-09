/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Minimal playback-source metadata needed to build a media descriptor
 */
export type MediaSourcePlaybackSource = {
  url: string;
  mimeType: string | null;
  posterUrl: string | null;
};
