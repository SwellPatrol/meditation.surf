/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PlaybackSource } from "@meditation-surf/player-core";

import { DEMO_SURF_VIDEO } from "./catalog/demoCatalog";

/**
 * @brief Playback policy for the shared demo background video
 *
 * This shape captures the player flags needed to keep the background treatment consistent across apps.
 */
export type DemoBackgroundVideoPolicy = {
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  playsInline: boolean;
  objectFit: "cover";
};

/**
 * @brief Shared product-level playback behavior for the demo background video
 *
 * Each app still owns its own player wiring and fullscreen presentation.
 */
export const DEMO_BACKGROUND_VIDEO_POLICY: DemoBackgroundVideoPolicy = {
  autoplay: true,
  loop: true,
  muted: true,
  playsInline: true,
  objectFit: "cover",
};

/**
 * @brief Return the shared demo playback source used by the background treatment
 *
 * This exposes the canonical background video source from the shared demo catalog.
 *
 * @returns The playback source used for the demo background video
 */
export function getDemoBackgroundVideoSource(): PlaybackSource {
  return DEMO_SURF_VIDEO.playbackSource;
}
