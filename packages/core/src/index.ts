/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export { AppLayout } from "./AppLayout";
export { BackgroundLayerLayout } from "./BackgroundLayerLayout";
export { MeditationExperience } from "./MeditationExperience";
export {
  BackgroundVideoModel,
  type BackgroundVideoPlaybackPolicy,
} from "./BackgroundVideoModel";
export {
  CenteredOverlayLayout,
  type CenteredOverlayPlacement,
  type CenteredOverlaySize,
} from "./CenteredOverlayLayout";
export { CenteredIconOverlayModel } from "./CenteredIconOverlayModel";
export type { ICatalogClient } from "./api/ICatalogClient";
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
export { Catalog, type CatalogInit } from "./catalog/Catalog";
export {
  CatalogSection,
  type CatalogSectionInit,
} from "./catalog/CatalogSection";
export { MediaItem, type MediaItemInit } from "./catalog/MediaItem";
export { DemoExperienceFactory } from "./DemoExperienceFactory";
export { ForegroundUiElement } from "./ForegroundUiElement";
export type {
  ForegroundUiElementPlacement,
  ForegroundUiElementSize,
} from "./ForegroundUiElement";
export { ForegroundLayerLayout } from "./ForegroundLayerLayout";
export { ForegroundUiModel } from "./ForegroundUiModel";
export {
  AudioPreferences,
  type AudioPreferencesInit,
} from "./preferences/AudioPreferences";
export type { IAudioPreferencesStorage } from "./preferences/IAudioPreferencesStorage";
export { BrowserAudioPreferencesStorage } from "./preferences/BrowserAudioPreferencesStorage";
