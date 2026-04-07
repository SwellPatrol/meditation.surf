/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export { DemoCatalogClient } from "./api/catalogClient";
export type { CatalogClient } from "./api/catalogClient";
export type {
  AnalyticsEventName,
  AnalyticsEventPayloadMap,
} from "./analytics/events";
export { DEMO_CATALOG, DEMO_SURF_VIDEO } from "./catalog/demoCatalog";
export type {
  AppCatalog,
  CatalogCategory,
  MediaContent,
} from "./catalog/types";
export {
  clampAudioVolume,
  DEFAULT_AUDIO_PREFERENCES,
  normalizeAudioPreferences,
} from "./preferences/audioPreferences";
export type {
  AudioPreferences,
  AudioPreferencesStorage,
} from "./preferences/audioPreferences";
