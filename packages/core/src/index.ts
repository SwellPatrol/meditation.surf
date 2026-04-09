/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

export { DemoExperienceFactory } from "./bootstrap/DemoExperienceFactory";
export { MeditationExperience } from "./experience/MeditationExperience";
export { AppLayout } from "./layout/AppLayout";
export { BackgroundLayerLayout } from "./layout/BackgroundLayerLayout";
export {
  CenteredOverlayLayout,
  DEMO_CENTERED_OVERLAY_LAYOUT,
  type CenteredOverlayPlacement,
  type CenteredOverlaySize,
} from "./layout/CenteredOverlayLayout";
export { ForegroundLayerLayout } from "./layout/ForegroundLayerLayout";
export {
  BackgroundVideoModel,
  type BackgroundVideoPlaybackPolicy,
} from "./playback/BackgroundVideoModel";
export {
  PlaybackSequenceController,
  type PlaybackSequenceListener,
  type PlaybackSequenceState,
} from "./playback/PlaybackSequenceController";
export {
  OverlayController,
  type OverlayConfig,
  type OverlayEventType,
  type OverlayState,
  type OverlayStateListener,
  type OverlayVisibility,
} from "./ui/OverlayController";
export { ForegroundUiElement } from "./ui/ForegroundUiElement";
export type {
  ForegroundUiElementPlacement,
  ForegroundUiElementSize,
} from "./ui/ForegroundUiElement";
export { ForegroundUiModel } from "./ui/ForegroundUiModel";
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
export { Catalog } from "./catalog/Catalog";
export { CatalogSection } from "./catalog/CatalogSection";
export { FixtureCatalog } from "./catalog/FixtureCatalog";
export { MediaItem } from "./catalog/MediaItem";
export { MediaItemMetadata } from "./catalog/MediaItemMetadata";
export {
  AudioPreferences,
  type AudioPreferencesInit,
} from "./preferences/AudioPreferences";
export type { IAudioPreferencesStorage } from "./preferences/IAudioPreferencesStorage";
export { BrowserAudioPreferencesStorage } from "./preferences/BrowserAudioPreferencesStorage";
