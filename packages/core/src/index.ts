/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export { MeditationExperience } from "./MeditationExperience";
export {
  BackgroundVideoModel,
  type BackgroundVideoPlaybackPolicy,
} from "./BackgroundVideoModel";
export {
  CenteredIconOverlayModel,
  DEMO_CENTERED_ICON_OVERLAY,
} from "./CenteredIconOverlayModel";
export type { CatalogClient } from "./api/CatalogClient";
export { DemoCatalogClient } from "./api/DemoCatalogClient";
export {
  AppLaunchedAnalyticsEvent,
  type AppLaunchedAnalyticsEventApp,
  type AppLaunchedAnalyticsEventPayload,
} from "./analytics/AppLaunchedAnalyticsEvent";
export {
  AudioPreferencesChangedAnalyticsEvent,
  type AudioPreferencesChangedAnalyticsEventPayload,
} from "./analytics/AudioPreferencesChangedAnalyticsEvent";
export {
  CatalogLoadedAnalyticsEvent,
  type CatalogLoadedAnalyticsEventPayload,
} from "./analytics/CatalogLoadedAnalyticsEvent";
export type { IAnalyticsEvent } from "./analytics/IAnalyticsEvent";
export {
  PlaybackStartedAnalyticsEvent,
  type PlaybackStartedAnalyticsEventPayload,
} from "./analytics/PlaybackStartedAnalyticsEvent";
export { Catalog, CatalogSection, MediaItem } from "./catalog";
export type { CatalogInit, CatalogSectionInit, MediaItemInit } from "./catalog";
export { DemoCatalog } from "./catalog/DemoCatalog";
export { DemoBackgroundVideo } from "./DemoBackgroundVideo";
export { DemoExperienceFactory } from "./DemoExperienceFactory";
export { ForegroundUiElement } from "./ForegroundUiElement";
export type {
  ForegroundUiElementPlacement,
  ForegroundUiElementSize,
} from "./ForegroundUiElement";
export { ForegroundUiModel } from "./ForegroundUiModel";
export {
  AudioPreferences,
  type AudioPreferencesInit,
} from "./preferences/AudioPreferences";
export type { AudioPreferencesStorage } from "./preferences/AudioPreferencesStorage";
export { BrowserAudioPreferencesStorage } from "./preferences/BrowserAudioPreferencesStorage";
