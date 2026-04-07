/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export { MeditationExperience } from "./MeditationExperience";
export { DemoCatalogClient } from "./api/catalogClient";
export type { CatalogClient } from "./api/catalogClient";
export type {
  AnalyticsEventName,
  AnalyticsEventPayloadMap,
} from "./analytics/events";
export {
  BRAND_OVERLAY_ICON_ASPECT_RATIO,
  BRAND_OVERLAY_ICON_MAX_SIZE_PX,
  BRAND_OVERLAY_ICON_VIEWPORT_RATIO,
  getBrandOverlayIconSize,
} from "./brand/overlay";
export { DEMO_CATALOG, DEMO_SURF_VIDEO } from "./catalog/demoCatalog";
export {
  Catalog,
  CatalogSection,
  MediaItem,
  type AppCatalog,
  type CatalogCategory,
  type MediaContent,
} from "./catalog/types";
export { DemoExperienceFactory } from "./demoExperienceFactory";
export {
  BackgroundVideoModel,
  DemoBackgroundVideo,
  DEMO_BACKGROUND_VIDEO_POLICY,
  createDemoBackgroundVideo,
  getDemoBackgroundVideoSource,
} from "./demoBackgroundVideo";
export type {
  BackgroundVideoPlaybackPolicy,
  DemoBackgroundVideoPolicy,
} from "./demoBackgroundVideo";
export {
  CenteredIconOverlayModel,
  DEMO_CENTERED_ICON_OVERLAY,
  ForegroundUiElement,
  ForegroundUiModel,
} from "./foregroundUi";
export type {
  ForegroundUiElementPlacement,
  ForegroundUiElementSize,
} from "./foregroundUi";
export {
  clampAudioVolume,
  DEFAULT_AUDIO_PREFERENCES,
  normalizeAudioPreferences,
} from "./preferences/audioPreferences";
export type {
  AudioPreferences,
  AudioPreferencesStorage,
} from "./preferences/audioPreferences";
