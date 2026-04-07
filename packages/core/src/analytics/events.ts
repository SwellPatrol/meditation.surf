/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Shared analytics event names used across both apps
 *
 * These names define the stable analytics vocabulary for shared features.
 */
export type AnalyticsEventName =
  | "app_launched"
  | "catalog_loaded"
  | "playback_started"
  | "audio_preferences_changed";

/**
 * @brief Shared analytics payload types keyed by event name
 *
 * Each analytics event name maps to the payload emitted for that event.
 */
export type AnalyticsEventPayloadMap = {
  app_launched: {
    app: "tv-lightning" | "mobile-expo";
  };
  catalog_loaded: {
    categoryCount: number;
    itemCount: number;
  };
  playback_started: {
    contentId: string;
  };
  audio_preferences_changed: {
    muted: boolean;
    volume: number;
  };
};
